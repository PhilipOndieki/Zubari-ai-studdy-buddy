import openai
import os
import json
from typing import List, Dict

class AIService:
    def __init__(self):
        self.client = openai.OpenAI(
            api_key=os.getenv('OPENAI_API_KEY')
        )
    
    def generate_questions(self, notes: str) -> List[Dict[str, str]]:
        """Generate flashcard questions from study notes using OpenAI"""
        try:
            prompt = f"""
            Based on the following study notes, generate exactly 5 flashcard questions and answers.
            Each question should test understanding of key concepts from the notes.
            
            Study Notes:
            {notes}
            
            Please respond with a JSON array containing exactly 5 objects, each with 'question' and 'answer' fields.
            Make questions clear, concise, and educational. Answers should be comprehensive but not too long.
            
            Example format:
            [
                {{"question": "What is...", "answer": "The answer is..."}},
                {{"question": "How does...", "answer": "It works by..."}}
            ]
            """
            
            response = self.client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": "You are an expert educator who creates high-quality study questions. Always respond with valid JSON only."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=1000,
                temperature=0.7
            )
            
            # Parse the response
            content = response.choices[0].message.content.strip()
            
            # Try to extract JSON from the response
            try:
                questions = json.loads(content)
                
                # Validate the structure
                if isinstance(questions, list) and len(questions) == 5:
                    for q in questions:
                        if not isinstance(q, dict) or 'question' not in q or 'answer' not in q:
                            raise ValueError("Invalid question format")
                    return questions
                else:
                    raise ValueError("Invalid response format")
                    
            except (json.JSONDecodeError, ValueError) as e:
                print(f"Error parsing AI response: {e}")
                return self._get_fallback_questions(notes)
                
        except Exception as e:
            print(f"Error calling OpenAI API: {e}")
            return self._get_fallback_questions(notes)
    
    def _get_fallback_questions(self, notes: str) -> List[Dict[str, str]]:
        """Generate fallback questions when AI service fails"""
        words = notes.split()
        topic = " ".join(words[:5]) if len(words) >= 5 else "the provided content"
        
        return [
            {
                "question": f"What are the main concepts discussed in {topic}?",
                "answer": "Please review the study notes to identify the key concepts and their relationships."
            },
            {
                "question": f"How would you explain the key points from {topic} to someone else?",
                "answer": "Focus on the most important ideas and use simple, clear language to explain them."
            },
            {
                "question": f"What are the practical applications of the concepts in {topic}?",
                "answer": "Consider how these concepts might be used in real-world scenarios or further studies."
            },
            {
                "question": f"What questions might arise from studying {topic}?",
                "answer": "Think about areas that need clarification or deeper exploration."
            },
            {
                "question": f"How does {topic} relate to other subjects or concepts you've learned?",
                "answer": "Look for connections and relationships with previously studied material."
            }
        ]