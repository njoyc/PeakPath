from flask import Flask, render_template, request, redirect, url_for, flash, jsonify, session, make_response
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager, UserMixin, login_user, login_required, logout_user, current_user
from werkzeug.security import generate_password_hash, check_password_hash
from flask_migrate import Migrate
from datetime import datetime, timezone
import csv
import io
import os
import requests
from dotenv import load_dotenv
load_dotenv()



# --------------------------- Flask App Config --------------------------- #
app = Flask(__name__)
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'dev-secret')
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///studyplanner.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# --------------------------- Extensions --------------------------- #
db = SQLAlchemy(app)
migrate = Migrate(app, db)
login_manager = LoginManager(app)
login_manager.login_view = 'login'

groq_api_key = os.getenv("GROQ_API_KEY")

# --------------------------- Models --------------------------- #
class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(128), nullable=False)
    tasks = db.relationship('Task', backref='user', lazy=True)
    keypoints = db.relationship('KeyPoint', backref='user', lazy=True)

class Task(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    type = db.Column(db.String(50), nullable=False)
    start_date = db.Column(db.Date, nullable=False)  # <-- Added start_date
    deadline = db.Column(db.Date, nullable=False)
    estimated_hours = db.Column(db.Integer, nullable=False)
    difficulty = db.Column(db.Integer, nullable=False)
    completed = db.Column(db.Boolean, default=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

class KeyPoint(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    content = db.Column(db.String(500), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

# --------------------------- Auth Routes --------------------------- #
@app.route('/')
def index():
    return redirect(url_for('dashboard')) if current_user.is_authenticated else redirect(url_for('login'))

@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        username = request.form['username']
        email = request.form['email']
        password = request.form['password']

        if User.query.filter_by(username=username).first():
            flash('Username already exists')
            return redirect(url_for('register'))
        if User.query.filter_by(email=email).first():
            flash('Email already exists')
            return redirect(url_for('register'))

        user = User(
            username=username,
            email=email,
            password_hash=generate_password_hash(password)
        )
        db.session.add(user)
        db.session.commit()
        flash('Registration successful')
        return redirect(url_for('login'))

    return render_template('register.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        user = User.query.filter_by(username=request.form['username']).first()
        if user and check_password_hash(user.password_hash, request.form['password']):
            login_user(user)
            return redirect(url_for('dashboard'))
        flash('Invalid credentials')
    return render_template('login.html')

@app.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('login'))

# --------------------------- Dashboard --------------------------- #
@app.route('/dashboard')
@login_required
def dashboard():
    tasks = Task.query.filter_by(user_id=current_user.id).all()
    return render_template('dashboard.html', tasks=tasks, username=current_user.username)

# --------------------------- Task API --------------------------- #
@app.route('/api/tasks', methods=['GET', 'POST', 'DELETE'])
@login_required
def api_tasks():
    if request.method == 'POST':
        data = request.get_json()
        task = Task(
            name=data['name'],
            type=data['type'],
            start_date=datetime.strptime(data['start_date'], '%Y-%m-%d').date() if data.get('start_date') else None,
            deadline=datetime.strptime(data['deadline'], '%Y-%m-%d').date(),
            estimated_hours=data['estimated_hours'],
            difficulty=data['difficulty'],
            user_id=current_user.id
        )
        db.session.add(task)
        db.session.commit()
        return jsonify({'status': 'success', 'id': task.id})

    elif request.method == 'GET':
        tasks = Task.query.filter_by(user_id=current_user.id).all()
        return jsonify([{
            'id': t.id,
            'name': t.name,
            'type': t.type,
            'start_date': t.start_date.isoformat() if t.start_date else '',
            'deadline': t.deadline.isoformat(),
            'estimated_hours': t.estimated_hours,
            'difficulty': t.difficulty,
            'completed': t.completed
        } for t in tasks])

    elif request.method == 'DELETE':
        task_id = request.get_json().get('id')
        task = Task.query.get(task_id)
        if task and task.user_id == current_user.id:
            db.session.delete(task)
            db.session.commit()
            return jsonify({'status': 'success'})
        return jsonify({'status': 'error'})

@app.route('/api/tasks/<int:task_id>/complete', methods=['POST'])
@login_required
def complete_task(task_id):
    task = Task.query.get(task_id)
    if task and task.user_id == current_user.id:
        task.completed = not task.completed
        db.session.commit()
        return jsonify({'status': 'success', 'completed': task.completed})
    return jsonify({'status': 'error'})

@app.route('/api/tasks/<int:task_id>', methods=['PUT'])
@login_required
def edit_task(task_id):
    task = Task.query.get(task_id)
    if not task or task.user_id != current_user.id:
        return jsonify({'status': 'error'})
    data = request.get_json()
    task.name = data.get('name', task.name)
    task.type = data.get('type', task.type)
    task.start_date = datetime.strptime(data.get('start_date', task.start_date.isoformat()), '%Y-%m-%d').date() if data.get('start_date') else task.start_date
    task.deadline = datetime.strptime(data.get('deadline', task.deadline.isoformat()), '%Y-%m-%d').date()
    task.estimated_hours = data.get('estimated_hours', task.estimated_hours)
    task.difficulty = data.get('difficulty', task.difficulty)
    db.session.commit()
    return jsonify({'status': 'success'})

# --------------------------- KeyPoints API --------------------------- #
@app.route('/api/keypoints', methods=['GET', 'POST', 'DELETE'])
@login_required
def keypoints():
    if request.method == 'POST':
        data = request.get_json()
        content = data.get('content')
        if not content:
            return jsonify({'status': 'error', 'message': 'Content is required'}), 400

        kp = KeyPoint(content=content, user_id=current_user.id)
        db.session.add(kp)
        db.session.commit()
        return jsonify({'status': 'success', 'id': kp.id})

    elif request.method == 'GET':
        keypoints = KeyPoint.query.filter_by(user_id=current_user.id).all()
        return jsonify([{'id': k.id, 'content': k.content} for k in keypoints])

    elif request.method == 'DELETE':
        kp_id = request.get_json().get('id')
        kp = KeyPoint.query.get(kp_id)
        if kp and kp.user_id == current_user.id:
            db.session.delete(kp)
            db.session.commit()
            return jsonify({'status': 'success'})
        return jsonify({'status': 'error', 'message': 'Key point not found or unauthorized'}), 404


# --------------------------- CSV Export --------------------------- #
@app.route('/export/csv')
@login_required
def export_csv():
    tasks = Task.query.filter_by(user_id=current_user.id).all()
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(['Name', 'Type', 'Start Date', 'Deadline', 'Estimated Hours', 'Difficulty', 'Completed'])
    for t in tasks:
        writer.writerow([
            t.name, t.type,
            t.start_date.isoformat() if t.start_date else '',
            t.deadline.isoformat(),
            t.estimated_hours, t.difficulty,
            'Yes' if t.completed else 'No'
        ])
    response = make_response(output.getvalue())
    response.headers['Content-Type'] = 'text/csv'
    response.headers['Content-Disposition'] = 'attachment; filename=tasks.csv'
    return response

# --------------------------- StudyBot via LLaMA (Ollama) --------------------------- #
@app.route('/studybot', methods=['POST'])
@login_required
def studybot():
    data = request.get_json()
    messages = data.get("messages", [])
    if not messages:
        return jsonify({"reply": "Please provide a message."}), 400

    try:
        res = requests.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {groq_api_key}",
                "Content-Type": "application/json"
            },
            json={
                "model": "meta-llama/llama-4-scout-17b-16e-instruct",
                "messages": messages
            }
        )

        res.raise_for_status()
        content = res.json()['choices'][0]['message']['content']
        return jsonify({"reply": content.strip()})

    except Exception as e:
        print("❌ StudyBot error:", e)
        return jsonify({"reply": "⚠️ StudyBot is facing issues. Please try again shortly."})

# --------------------------- Run Server --------------------------- #
if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True, port=3000)
