import mysql.connector
from mysql.connector import Error
import os
from datetime import datetime

class Database:
    def __init__(self):
        self.config = {
            'host': os.getenv('MYSQL_HOST', 'localhost'),
            'database': os.getenv('MYSQL_DATABASE', 'ai_study_buddy'),
            'user': os.getenv('MYSQL_USER', 'root'),
            'password': os.getenv('MYSQL_PASSWORD', ''),
            'charset': 'utf8mb4',
            'collation': 'utf8mb4_unicode_ci'
        }
    
    def get_connection(self):
        """Create and return a database connection"""
        try:
            connection = mysql.connector.connect(**self.config)
            return connection
        except Error as e:
            print(f"Error connecting to MySQL: {e}")
            return None
    
    def init_database(self):
        """Initialize the database and create tables"""
        connection = self.get_connection()
        if not connection:
            print("Failed to connect to database")
            return False
        
        cursor = connection.cursor()
        
        try:
            # Create database if it doesn't exist
            cursor.execute(f"CREATE DATABASE IF NOT EXISTS {self.config['database']}")
            cursor.execute(f"USE {self.config['database']}")
            
            # Flashcards table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS flashcards (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    question TEXT NOT NULL,
                    answer TEXT NOT NULL,
                    category VARCHAR(100) DEFAULT 'General',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    INDEX idx_category (category),
                    INDEX idx_created_at (created_at)
                )
            ''')
            
            connection.commit()
            print("Database initialized successfully")
            return True
            
        except Error as e:
            print(f"Error initializing database: {e}")
            return False
        finally:
            cursor.close()
            connection.close()
    
    def save_flashcard(self, question, answer, category='General'):
        """Save a flashcard to the database"""
        connection = self.get_connection()
        if not connection:
            return None
        
        cursor = connection.cursor()
        
        try:
            cursor.execute(
                'INSERT INTO flashcards (question, answer, category) VALUES (%s, %s, %s)',
                (question, answer, category)
            )
            flashcard_id = cursor.lastrowid
            connection.commit()
            return flashcard_id
            
        except Error as e:
            print(f"Error saving flashcard: {e}")
            return None
        finally:
            cursor.close()
            connection.close()
    
    def get_flashcards(self, category=None):
        """Retrieve flashcards from the database"""
        connection = self.get_connection()
        if not connection:
            return []
        
        cursor = connection.cursor(dictionary=True)
        
        try:
            if category:
                cursor.execute(
                    'SELECT * FROM flashcards WHERE category = %s ORDER BY created_at DESC',
                    (category,)
                )
            else:
                cursor.execute('SELECT * FROM flashcards ORDER BY created_at DESC')
            
            flashcards = cursor.fetchall()
            
            # Convert datetime objects to strings for JSON serialization
            for flashcard in flashcards:
                if flashcard['created_at']:
                    flashcard['created_at'] = flashcard['created_at'].isoformat()
            
            return flashcards
            
        except Error as e:
            print(f"Error retrieving flashcards: {e}")
            return []
        finally:
            cursor.close()
            connection.close()
    
    def delete_flashcard(self, flashcard_id):
        """Delete a flashcard from the database"""
        connection = self.get_connection()
        if not connection:
            return False
        
        cursor = connection.cursor()
        
        try:
            cursor.execute('DELETE FROM flashcards WHERE id = %s', (flashcard_id,))
            connection.commit()
            return cursor.rowcount > 0
            
        except Error as e:
            print(f"Error deleting flashcard: {e}")
            return False
        finally:
            cursor.close()
            connection.close()
    
    def get_categories(self):
        """Get all unique categories"""
        connection = self.get_connection()
        if not connection:
            return []
        
        cursor = connection.cursor()
        
        try:
            cursor.execute('SELECT DISTINCT category FROM flashcards ORDER BY category')
            categories = [row[0] for row in cursor.fetchall()]
            return categories
            
        except Error as e:
            print(f"Error retrieving categories: {e}")
            return []
        finally:
            cursor.close()
            connection.close()