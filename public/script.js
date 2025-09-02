// Global state
let currentFlashcards = [];
let savedFlashcards = [];
let currentSection = 'generator';

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    initializeEventListeners();
    loadSavedFlashcards();
    updateCharCounter();
    showSection('generator');
});

// Event listeners
function initializeEventListeners() {
    // Navigation
    const viewSavedBtn = document.getElementById('viewSavedBtn');
    const categoriesBtn = document.getElementById('categoriesBtn');
    const backToGeneratorBtn = document.getElementById('backToGeneratorBtn');
    
    if (viewSavedBtn) {
        viewSavedBtn.addEventListener('click', () => showSection('saved'));
    }
    
    if (backToGeneratorBtn) {
        backToGeneratorBtn.addEventListener('click', () => showSection('generator'));
    }
    
    // Forms
    const notesForm = document.getElementById('notesForm');
    if (notesForm) {
        notesForm.addEventListener('submit', handleNotesSubmission);
    }
    
    // Character counter
    const studyNotes = document.getElementById('studyNotes');
    if (studyNotes) {
        studyNotes.addEventListener('input', updateCharCounter);
    }
    
    // Save all button
    const saveAllBtn = document.getElementById('saveAllBtn');
    if (saveAllBtn) {
        saveAllBtn.addEventListener('click', saveAllFlashcards);
    }
    
    // Category filter
    const categoryFilter = document.getElementById('categoryFilter');
    if (categoryFilter) {
        categoryFilter.addEventListener('change', filterFlashcards);
    }
}

// Section management
function showSection(section) {
    const generatorSection = document.getElementById('generatorSection');
    const savedSection = document.getElementById('savedSection');
    
    if (section === 'generator') {
        generatorSection.classList.remove('hidden');
        savedSection.classList.add('hidden');
        currentSection = 'generator';
    } else if (section === 'saved') {
        generatorSection.classList.add('hidden');
        savedSection.classList.remove('hidden');
        currentSection = 'saved';
        loadSavedFlashcards();
        loadCategories();
    }
}

// Character counter
function updateCharCounter() {
    const studyNotes = document.getElementById('studyNotes');
    const charCount = document.getElementById('charCount');
    const generateBtn = document.getElementById('generateBtn');
    
    if (studyNotes && charCount) {
        const count = studyNotes.value.length;
        charCount.textContent = count;
        
        const counter = charCount.parentElement;
        if (count >= 50) {
            counter.classList.add('valid');
            if (generateBtn) generateBtn.disabled = false;
        } else {
            counter.classList.remove('valid');
            if (generateBtn) generateBtn.disabled = true;
        }
    }
}

// Handle notes submission
async function handleNotesSubmission(e) {
    e.preventDefault();
    
    const studyNotes = document.getElementById('studyNotes').value.trim();
    const category = document.getElementById('category').value.trim() || 'General';
    const generateBtn = document.getElementById('generateBtn');
    const btnText = generateBtn.querySelector('.btn-text');
    const btnLoading = generateBtn.querySelector('.btn-loading');
    
    if (studyNotes.length < 50) {
        showMessage('Please provide at least 50 characters of study notes', 'error');
        return;
    }
    
    try {
        // Show loading state
        generateBtn.disabled = true;
        btnText.classList.add('hidden');
        btnLoading.classList.remove('hidden');
        
        const response = await fetch('/api/generate-questions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ notes: studyNotes })
        });
        
        const data = await response.json();
        
        if (data.error) {
            showMessage(data.error, 'error');
            return;
        }
        
        // Store current flashcards with category
        currentFlashcards = data.questions.map(q => ({
            ...q,
            category: category,
            saved: false
        }));
        
        displayFlashcards(currentFlashcards);
        showMessage('Flashcards generated successfully!', 'success');
        
    } catch (error) {
        console.error('Error generating questions:', error);
        showMessage('Failed to generate flashcards. Please try again.', 'error');
    } finally {
        // Reset button state
        generateBtn.disabled = false;
        btnText.classList.remove('hidden');
        btnLoading.classList.add('hidden');
    }
}

// Display flashcards
function displayFlashcards(flashcards, container = 'flashcardsGrid') {
    const grid = document.getElementById(container);
    const flashcardsContainer = document.getElementById('flashcardsContainer');
    
    if (!grid) return;
    
    if (flashcards.length === 0) {
        if (container === 'savedFlashcardsGrid') {
            document.getElementById('noSavedCards').classList.remove('hidden');
        }
        return;
    }
    
    if (container === 'savedFlashcardsGrid') {
        document.getElementById('noSavedCards').classList.add('hidden');
    }
    
    grid.innerHTML = flashcards.map((flashcard, index) => `
        <div class="flashcard" data-index="${index}" data-id="${flashcard.id || ''}">
            <div class="flashcard-inner">
                <div class="flashcard-front">
                    <div class="flashcard-content">
                        <h3>${escapeHtml(flashcard.question)}</h3>
                    </div>
                    <div class="flashcard-footer">
                        Click to reveal answer
                    </div>
                </div>
                <div class="flashcard-back">
                    <div class="flashcard-content">
                        <p>${escapeHtml(flashcard.answer)}</p>
                    </div>
                    <div class="flashcard-footer">
                        <div>Category: ${escapeHtml(flashcard.category)}</div>
                        <div class="flashcard-actions">
                            ${flashcard.saved ? 
                                '<span class="saved-indicator">✓ Saved</span>' : 
                                '<button class="action-btn save-btn" onclick="saveFlashcard(' + index + ')">💾 Save</button>'
                            }
                            ${flashcard.id ? 
                                '<button class="action-btn delete-btn" onclick="deleteFlashcard(' + flashcard.id + ')">🗑️ Delete</button>' : 
                                ''
                            }
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
    
    // Add click listeners for flipping
    const flashcardElements = grid.querySelectorAll('.flashcard');
    flashcardElements.forEach(card => {
        card.addEventListener('click', (e) => {
            // Don't flip if clicking on action buttons
            if (e.target.classList.contains('action-btn')) {
                e.stopPropagation();
                return;
            }
            card.classList.toggle('flipped');
        });
    });
    
    // Show flashcards container
    if (flashcardsContainer && container === 'flashcardsGrid') {
        flashcardsContainer.classList.remove('hidden');
        
        // Smooth scroll to flashcards
        setTimeout(() => {
            flashcardsContainer.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'start' 
            });
        }, 100);
    }
}

// Save individual flashcard
async function saveFlashcard(index) {
    const flashcard = currentFlashcards[index];
    
    try {
        const response = await fetch('/api/save-flashcard', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                question: flashcard.question,
                answer: flashcard.answer,
                category: flashcard.category
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            currentFlashcards[index].saved = true;
            currentFlashcards[index].id = data.id;
            displayFlashcards(currentFlashcards);
            showMessage('Flashcard saved successfully!', 'success');
        } else {
            showMessage(data.error || 'Failed to save flashcard', 'error');
        }
        
    } catch (error) {
        console.error('Error saving flashcard:', error);
        showMessage('Failed to save flashcard. Please try again.', 'error');
    }
}

// Save all flashcards
async function saveAllFlashcards() {
    const unsavedCards = currentFlashcards.filter(card => !card.saved);
    
    if (unsavedCards.length === 0) {
        showMessage('All flashcards are already saved!', 'success');
        return;
    }
    
    try {
        const savePromises = unsavedCards.map(async (card, originalIndex) => {
            const index = currentFlashcards.findIndex(c => c === card);
            const response = await fetch('/api/save-flashcard', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    question: card.question,
                    answer: card.answer,
                    category: card.category
                })
            });
            
            const data = await response.json();
            if (data.success) {
                currentFlashcards[index].saved = true;
                currentFlashcards[index].id = data.id;
            }
            return data.success;
        });
        
        const results = await Promise.all(savePromises);
        const successCount = results.filter(Boolean).length;
        
        displayFlashcards(currentFlashcards);
        showMessage(`${successCount} flashcard(s) saved successfully!`, 'success');
        
    } catch (error) {
        console.error('Error saving flashcards:', error);
        showMessage('Failed to save some flashcards. Please try again.', 'error');
    }
}

// Load saved flashcards
async function loadSavedFlashcards() {
    try {
        const response = await fetch('/api/flashcards');
        const data = await response.json();
        
        if (data.flashcards) {
            savedFlashcards = data.flashcards.map(card => ({
                ...card,
                saved: true
            }));
            displayFlashcards(savedFlashcards, 'savedFlashcardsGrid');
        }
        
    } catch (error) {
        console.error('Error loading saved flashcards:', error);
        showMessage('Failed to load saved flashcards', 'error');
    }
}

// Load categories
async function loadCategories() {
    try {
        const response = await fetch('/api/categories');
        const data = await response.json();
        
        const categoryFilter = document.getElementById('categoryFilter');
        if (categoryFilter && data.categories) {
            categoryFilter.innerHTML = '<option value="">All Categories</option>' +
                data.categories.map(cat => `<option value="${escapeHtml(cat)}">${escapeHtml(cat)}</option>`).join('');
        }
        
    } catch (error) {
        console.error('Error loading categories:', error);
    }
}

// Filter flashcards by category
function filterFlashcards() {
    const categoryFilter = document.getElementById('categoryFilter');
    const selectedCategory = categoryFilter.value;
    
    const filteredCards = selectedCategory 
        ? savedFlashcards.filter(card => card.category === selectedCategory)
        : savedFlashcards;
    
    displayFlashcards(filteredCards, 'savedFlashcardsGrid');
}

// Delete flashcard
async function deleteFlashcard(flashcardId) {
    if (!confirm('Are you sure you want to delete this flashcard?')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/flashcard/${flashcardId}`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Remove from current flashcards if present
            currentFlashcards = currentFlashcards.filter(card => card.id !== flashcardId);
            
            // Reload saved flashcards
            await loadSavedFlashcards();
            showMessage('Flashcard deleted successfully!', 'success');
        } else {
            showMessage(data.error || 'Failed to delete flashcard', 'error');
        }
        
    } catch (error) {
        console.error('Error deleting flashcard:', error);
        showMessage('Failed to delete flashcard. Please try again.', 'error');
    }
}

// Utility functions
function showMessage(message, type = 'success') {
    const container = document.getElementById('messageContainer');
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    messageDiv.textContent = message;
    
    container.appendChild(messageDiv);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (messageDiv.parentNode) {
            messageDiv.parentNode.removeChild(messageDiv);
        }
    }, 5000);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Initialize character counter on page load
function updateCharCounter() {
    const studyNotes = document.getElementById('studyNotes');
    const charCount = document.getElementById('charCount');
    const generateBtn = document.getElementById('generateBtn');
    
    if (studyNotes && charCount) {
        const count = studyNotes.value.length;
        charCount.textContent = count;
        
        const counter = charCount.parentElement;
        if (count >= 50) {
            counter.classList.add('valid');
            if (generateBtn) generateBtn.disabled = false;
        } else {
            counter.classList.remove('valid');
            if (generateBtn) generateBtn.disabled = true;
        }
    }
}