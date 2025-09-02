from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import os
from dotenv import load_dotenv
from database import Database
from ai_service import AIService

# Load environment variables
load_dotenv()

app = Flask(__name__, static_folder='../public')
CORS(app)

# Initialize services
db = Database()
ai_service = AIService()

@app.route('/')
def serve_index():
    return send_from_directory('../public', 'index.html')

@app.route('/<path:filename>')
def serve_static(filename):
    return send_from_directory('../public', filename)

@app.route('/api/generate-questions', methods=['POST'])
def generate_questions():
    try:
        data = request.get_json()
        notes = data.get('notes', '').strip()
        
        if not notes:
            return jsonify({'error': 'Please provide study notes'}), 400
        
        if len(notes) < 50:
            return jsonify({'error': 'Please provide more detailed notes (at least 50 characters)'}), 400
        
        # Generate questions using AI
        questions = ai_service.generate_questions(notes)
        
        if not questions:
            return jsonify({'error': 'Failed to generate questions. Please try again.'}), 500
        
        return jsonify({'questions': questions})
        
    except Exception as e:
        print(f"Error generating questions: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/save-flashcard', methods=['POST'])
def save_flashcard():
    try:
        data = request.get_json()
        question = data.get('question', '').strip()
        answer = data.get('answer', '').strip()
        category = data.get('category', 'General').strip()
        
        if not question or not answer:
            return jsonify({'error': 'Question and answer are required'}), 400
        
        flashcard_id = db.save_flashcard(question, answer, category)
        
        if flashcard_id:
            return jsonify({'success': True, 'id': flashcard_id})
        else:
            return jsonify({'error': 'Failed to save flashcard'}), 500
            
    except Exception as e:
        print(f"Error saving flashcard: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/flashcards', methods=['GET'])
def get_flashcards():
    try:
        category = request.args.get('category')
        flashcards = db.get_flashcards(category)
        return jsonify({'flashcards': flashcards})
        
    except Exception as e:
        print(f"Error retrieving flashcards: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/flashcard/<int:flashcard_id>', methods=['DELETE'])
def delete_flashcard(flashcard_id):
    try:
        success = db.delete_flashcard(flashcard_id)
        
        if success:
            return jsonify({'success': True})
        else:
            return jsonify({'error': 'Flashcard not found'}), 404
            
    except Exception as e:
        print(f"Error deleting flashcard: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/categories', methods=['GET'])
def get_categories():
    try:
        categories = db.get_categories()
        return jsonify({'categories': categories})
        
    except Exception as e:
        print(f"Error retrieving categories: {e}")
        return jsonify({'error': 'Internal server error'}), 500

if __name__ == '__main__':
    # Initialize database on startup
    db.init_database()
    app.run(debug=True, port=3000)