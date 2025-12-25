// === IMPORTS ===
import { auth, db, showNotification } from './app.js';
// Fixed import: 'setDocquery' was invalid; replaced with correct 'setDoc' and 'query'
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, onSnapshot, getDoc, setDoc, query, where, orderBy  } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

// === DOM ELEMENTS ===
const productForm = document.getElementById('productForm');
const productsList = document.getElementById('productsList');
const logoutBtn = document.getElementById('logoutBtn');
const submitBtn = document.getElementById('submitBtn');
const cancelEdit = document.getElementById('cancelEdit');
const editProductId = document.getElementById('editProductId');
const imagePreview = document.getElementById('imagePreview');
const imageInfo = document.getElementById('imageInfo');

// Chart variable
let stockChart;

// === AUTH & SETUP ===
async function initAdmin() {
    auth.onAuthStateChanged((user) => {
        if (!user) {
            window.location.href = 'admin-login.html';
            return;
        }
        console.log('Admin logged in:', user.email);
        setupAdmin();
    });
}

async function setupAdmin() {
    logoutBtn.addEventListener('click', handleLogout);
    loadProducts();
    loadQuotes();
    // --- FIX: Initialize feedback and FAQ loading ---
    loadPendingFeedback(); // Load pending feedback on admin page
    loadFAQsAdmin();       // Load FAQs for management

    if (productForm) {
        productForm.addEventListener('submit', handleProductSubmit);
    }
    if (cancelEdit) {
        cancelEdit.addEventListener('click', resetForm);
    }
    const addQuoteBtn = document.getElementById('addQuoteBtn');
    if (addQuoteBtn) {
        addQuoteBtn.addEventListener('click', addQuote);
    }
    // Show static path info instead of upload UI
    if (imageInfo) {
        imageInfo.innerHTML = '<div><strong>Local Image</strong><br><small>Image will be selected automatically by page count (e.g., 200.jpg for 200 pages).</small></div>';
    }
}

async function handleLogout() {
    try {
        await auth.signOut();
        window.location.href = 'index.html';
    } catch (error) {
        console.error('Logout error:', error);
        showNotification('Error logging out. Please try again.', true);
    }
}

// === CORE PRODUCT FUNCTIONS (MODIFIED FOR LOCAL ASSETS) ===
async function handleProductSubmit(e) {
    e.preventDefault();
    
    // 1. DETERMINE LOCAL IMAGE PATH BASED ON PAGE COUNT
    const pages = parseInt(document.getElementById('productPages').value);
    let imagePath = 'assets/products/default-notebook.jpg';
    
    if (pages === 200) imagePath = 'assets/products/200.jpg';
    else if (pages === 250) imagePath = 'assets/products/250.jpg';
    else if (pages === 300) imagePath = 'assets/products/300.jpg';
    else if (pages === 400) imagePath = 'assets/products/400.jpg';
    else if (pages === 500) imagePath = 'assets/products/500.jpg';
    
    // 2. BUILD PRODUCT DATA WITH LOCAL PATH
    const productData = {
        name: document.getElementById('productName').value,
        pages: pages,
        price: parseFloat(document.getElementById('productPrice').value),
        stock: parseInt(document.getElementById('productStock').value),
        imagePath: imagePath, // <-- Using local path, NOT a URL
        description: document.getElementById('productDescription').value || '',
        updatedAt: new Date().toISOString()
    };
    
    // 3. SAVE TO FIRESTORE
    try {
        if (editProductId.value) {
            await updateDoc(doc(db, "products", editProductId.value), productData);
            showNotification('Product updated successfully!');
        } else {
            productData.createdAt = new Date().toISOString();
            await addDoc(collection(db, "products"), productData);
            showNotification('Product added successfully!');
        }
        resetForm();
    } catch (error) {
        console.error('Error saving product:', error);
        showNotification('Error saving product. Please try again.', true);
    }
}

function createProductListItem(product, id) {
    const productItem = document.createElement('div');
    productItem.className = 'product-card';
    
    let stockClass = 'stock-in';
    let stockText = 'In Stock';
    
    if (product.stock <= 0) {
        stockClass = 'stock-out';
        stockText = 'Out of Stock';
    } else if (product.stock <= 10) {
        stockClass = 'stock-low';
        stockText = 'Low Stock';
    }
    
    // USING imagePath FROM PRODUCT DATA
    productItem.innerHTML = `
        <img src="${product.imagePath || 'assets/products/default-notebook.jpg'}" 
             alt="${product.name}" 
             class="product-image">
        <div class="product-info">
            <h3 class="product-title">${product.name}</h3>
            <div class="product-price">₹${product.price}</div>
            <span class="product-stock ${stockClass}">
                <i class="fas fa-box"></i> ${stockText} (${product.stock})
            </span>
            <p>${product.description || 'No description'}</p>
            <div class="admin-actions" style="display: flex; gap: 10px; margin-top: 10px;">
                <button class="btn-primary edit-btn" data-id="${id}">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button class="btn-secondary delete-btn" data-id="${id}">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </div>
        </div>
    `;
    
    if (productsList) {
        productsList.appendChild(productItem);
    }
    
    // Add event listeners
    productItem.querySelector('.edit-btn')?.addEventListener('click', () => editProduct(id, product));
    productItem.querySelector('.delete-btn')?.addEventListener('click', () => deleteProduct(id, product.name));
}

function editProduct(id, product) {
    document.getElementById('productName').value = product.name;
    document.getElementById('productPages').value = product.pages;
    document.getElementById('productPrice').value = product.price;
    document.getElementById('productStock').value = product.stock;
    document.getElementById('productDescription').value = product.description || '';
    editProductId.value = id;
    
    // Show local path preview
    if (imagePreview) {
        imagePreview.src = product.imagePath || 'assets/products/default-notebook.jpg';
    }
    if (imageInfo) {
        imageInfo.innerHTML = `<div><strong>Local Image: ${product.imagePath?.split('/').pop() || 'default'}</strong></div>`;
    }
    
    if (submitBtn) submitBtn.innerHTML = '<i class="fas fa-save"></i> Update Product';
    if (cancelEdit) cancelEdit.style.display = 'inline-block';
    
    const formCard = document.querySelector('.form-card');
    if (formCard) formCard.scrollIntoView({ behavior: 'smooth' });
}

async function deleteProduct(id, productName) {
    if (confirm(`Are you sure you want to delete "${productName}"?`)) {
        try {
            await deleteDoc(doc(db, "products", id));
            showNotification('Product deleted successfully!');
        } catch (error) {
            console.error('Error deleting product:', error);
            showNotification('Error deleting product. Please try again.', true);
        }
    }
}

function resetForm() {
    if (productForm) productForm.reset();
    editProductId.value = '';
    if (imagePreview) imagePreview.src = '';
    if (imageInfo) {
        imageInfo.innerHTML = '<div><strong>Local Image</strong><br><small>Image auto-selected by page count.</small></div>';
    }
    if (submitBtn) submitBtn.innerHTML = '<i class="fas fa-save"></i> Add Product';
    if (cancelEdit) cancelEdit.style.display = 'none';
}

// === OTHER FUNCTIONS (UNCHANGED) ===
function loadProducts() {
    onSnapshot(collection(db, "products"), (snapshot) => {
        if (productsList) productsList.innerHTML = '';
        let totalProducts = 0, lowStockCount = 0;
        const productsData = [];
        
        snapshot.forEach((doc) => {
            const product = doc.data();
            totalProducts++;
            if (product.stock <= 10) lowStockCount++;
            productsData.push({ id: doc.id, ...product });
            if (productsList) createProductListItem(product, doc.id);
        });
        
        const totalProductsEl = document.getElementById('totalProducts');
        const lowStockEl = document.getElementById('lowStock');
        if (totalProductsEl) totalProductsEl.textContent = `${totalProducts} Products`;
        if (lowStockEl) lowStockEl.textContent = `${lowStockCount} Low Stock`;
        updateStockChart(productsData);
    });
}

async function loadQuotes() {
    onSnapshot(collection(db, "quotes"), (snapshot) => {
        const quotesList = document.getElementById('quotesList');
        if (!quotesList) return;
        quotesList.innerHTML = '';
        snapshot.forEach((doc) => createQuoteItem(doc.data(), doc.id));
    });
}

function createQuoteItem(quote, id) {
    const quoteItem = document.createElement('div');
    quoteItem.className = 'quote-card';
    quoteItem.style.margin = '10px 0';
    quoteItem.innerHTML = `
        <p>"${quote.text}"</p>
        <button class="btn-secondary delete-quote-btn" data-id="${id}" style="margin-top: 10px; padding: 5px 10px;">
            <i class="fas fa-trash"></i> Delete
        </button>
    `;
    const quotesList = document.getElementById('quotesList');
    if (quotesList) quotesList.appendChild(quoteItem);
    quoteItem.querySelector('.delete-quote-btn')?.addEventListener('click', () => deleteQuote(id));
}

async function addQuote() {
    const newQuoteInput = document.getElementById('newQuote');
    const text = newQuoteInput.value.trim();
    if (!text) {
        showNotification('Please enter a quote', true);
        return;
    }
    try {
        await addDoc(collection(db, "quotes"), { text: text, createdAt: new Date().toISOString() });
        newQuoteInput.value = '';
        showNotification('Quote added successfully!');
    } catch (error) {
        console.error('Error adding quote:', error);
        showNotification('Error adding quote. Please try again.', true);
    }
}

async function deleteQuote(id) {
    if (confirm('Are you sure you want to delete this quote?')) {
        try {
            await deleteDoc(doc(db, "quotes", id));
            showNotification('Quote deleted successfully!');
        } catch (error) {
            console.error('Error deleting quote:', error);
            showNotification('Error deleting quote. Please try again.', true);
        }
    }
}

function updateStockChart(productsData) {
    const ctx = document.getElementById('stockChart');
    if (!ctx) return;
    const productNames = productsData.map(p => p.name);
    const stockData = productsData.map(p => p.stock);
    const colors = stockData.map(stock => {
        if (stock <= 0) return '#e74c3c';
        if (stock <= 10) return '#f39c12';
        return '#27ae60';
    });
    if (stockChart) stockChart.destroy();
    const chartCtx = ctx.getContext('2d');
    stockChart = new Chart(chartCtx, {
        type: 'bar',
        data: { labels: productNames, datasets: [{ label: 'Stock Quantity', data: stockData, backgroundColor: colors, borderColor: colors, borderWidth: 1 }] },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { beginAtZero: true, title: { display: true, text: 'Quantity' } },
                x: { title: { display: true, text: 'Products' }, ticks: { autoSkip: false, maxRotation: 45, minRotation: 45 } }
            },
            plugins: { legend: { display: false } }
        }
    });
}

// ======================================================
// FEEDBACK MANAGEMENT FUNCTIONS (Single, Corrected Set)
// ======================================================

// Function to load pending feedback submissions for admin review
async function loadPendingFeedback() {
    try {
        // Query the 'feedback_submissions' collection for items with status "pending"
        const q = query(
            collection(db, "feedback_submissions"),
            where("status", "==", "pending"),
            orderBy("createdAt", "desc") // Show newest first
        );
        const querySnapshot = await getDocs(q);

        const container = document.getElementById('pendingFeedbackList');
        if (!container) {
            console.log('Feedback container not found on this page');
            return;
        }

        container.innerHTML = ''; // Clear previous content

        if (querySnapshot.empty) {
            container.innerHTML = '<p style="text-align: center; padding: 2rem; color: #666;">No pending feedback to review.</p>';
            return;
        }

        // Loop through each pending submission and create a display card
        querySnapshot.forEach((doc) => {
            const feedback = doc.data();
            const item = document.createElement('div');
            item.className = 'form-card';
            item.style.marginBottom = '1rem';
            item.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: start;">
                    <h4 style="margin: 0;">${feedback.customerName}</h4>
                    <div style="color: #f39c12; font-size: 1.2rem;">
                        ${'★'.repeat(feedback.rating)}${'☆'.repeat(5 - feedback.rating)}
                    </div>
                </div>
                <p><small>Submitted: ${new Date(feedback.createdAt).toLocaleDateString('en-IN')}</small></p>
                <p style="background: #f8f9fa; padding: 1rem; border-radius: 5px; margin: 1rem 0;">
                    "${feedback.message}"
                </p>
                <div style="display: flex; gap: 10px;">
                    <button class="btn-primary" onclick="window.approveFeedback('${doc.id}')">
                        <i class="fas fa-check"></i> Approve
                    </button>
                    <button class="btn-secondary" onclick="window.rejectFeedback('${doc.id}')">
                        <i class="fas fa-times"></i> Reject
                    </button>
                </div>
            `;
            container.appendChild(item);
        });

    } catch (error) {
        console.error("Error loading pending feedback:", error);
        const container = document.getElementById('pendingFeedbackList');
        if (container) {
            container.innerHTML = '<p style="color: #e74c3c; text-align: center;">Error loading feedback.</p>';
        }
    }
}

// Function for admin to approve a feedback submission
window.approveFeedback = async function(feedbackId) {
    if (!confirm("Approve this testimonial to publish it on the website?")) return;

    try {
        await updateDoc(doc(db, "feedback_submissions", feedbackId), {
            status: "approved"
        });
        showNotification('Feedback approved and published on the website!');
        loadPendingFeedback(); // Refresh the list
    } catch (error) {
        console.error("Error approving feedback:", error);
        showNotification('Error approving feedback.', true);
    }
};

// Function for admin to reject a feedback submission
window.rejectFeedback = async function(feedbackId) {
    if (!confirm("Reject this submission? It will be deleted.")) return;

    try {
        await deleteDoc(doc(db, "feedback_submissions", feedbackId));
        showNotification('Feedback submission rejected and deleted.');
        loadPendingFeedback(); // Refresh the list
    } catch (error) {
        console.error("Error rejecting feedback:", error);
        showNotification('Error rejecting feedback.', true);
    }
};

// Function to load approved feedback for homepage (optional - for later)
async function loadApprovedTestimonials() {
    // You'll use this function on your homepage later
    const querySnapshot = await getDocs(
        query(collection(db, "feedback_submissions"), 
              where("status", "==", "approved"),
              orderBy("createdAt", "desc"))
    );
    // Return data for homepage display
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

// ============================================
// FAQ MANAGEMENT FUNCTIONS
// ============================================

// Load FAQs for admin panel
async function loadFAQsAdmin() {
    try {
        const q = query(collection(db, "faqs"), orderBy("order", "asc"));
        const querySnapshot = await getDocs(q);
        
        const container = document.getElementById('faqsListAdmin');
        if (!container) return;
        
        container.innerHTML = '';
        
        if (querySnapshot.empty) {
            container.innerHTML = '<p style="text-align: center; padding: 2rem; color: #666;">No FAQs added yet.</p>';
            return;
        }
        
        querySnapshot.forEach((doc) => {
            const faq = doc.data();
            const item = document.createElement('div');
            item.className = 'form-card';
            item.style.marginBottom = '1rem';
            item.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: start;">
                    <h4 style="margin: 0; flex: 1;">${faq.question}</h4>
                    <div style="color: #777; font-size: 0.9rem;">Order: ${faq.order}</div>
                </div>
                <p style="margin: 0.8rem 0; color: #555;">${faq.answer}</p>
                <div style="display: flex; gap: 10px; margin-top: 1rem;">
                    <button class="btn-primary" onclick="window.editFAQ('${doc.id}', '${faq.question.replace(/'/g, "\\'")}', '${faq.answer.replace(/'/g, "\\'")}', ${faq.order})">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="btn-secondary" onclick="window.deleteFAQ('${doc.id}')">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            `;
            container.appendChild(item);
        });
        
    } catch (error) {
        console.error("Error loading FAQs for admin:", error);
        const container = document.getElementById('faqsListAdmin');
        if (container) {
            container.innerHTML = '<p style="color: #e74c3c;">Error loading FAQs.</p>';
        }
    }
}

// Add new FAQ
window.addFAQ = async function() {
    const question = document.getElementById('faqQuestion').value.trim();
    const answer = document.getElementById('faqAnswer').value.trim();
    const order = parseInt(document.getElementById('faqOrder').value) || 1;
    
    if (!question || !answer) {
        showNotification('Please enter both question and answer.', true);
        return;
    }
    
    try {
        await addDoc(collection(db, "faqs"), {
            question: question,
            answer: answer,
            order: order,
            createdAt: new Date().toISOString()
        });
        
        showNotification('FAQ added successfully!');
        document.getElementById('faqQuestion').value = '';
        document.getElementById('faqAnswer').value = '';
        document.getElementById('faqOrder').value = '';
        
        loadFAQsAdmin(); // Refresh the list
        
    } catch (error) {
        console.error("Error adding FAQ:", error);
        showNotification('Error adding FAQ.', true);
    }
};

// Edit existing FAQ
window.editFAQ = async function(faqId, currentQuestion, currentAnswer, currentOrder) {
    const newQuestion = prompt("Edit question:", currentQuestion);
    if (newQuestion === null) return; // User cancelled
    
    const newAnswer = prompt("Edit answer:", currentAnswer);
    if (newAnswer === null) return;
    
    const newOrder = prompt("Edit display order (lower numbers show first):", currentOrder);
    if (newOrder === null) return;
    
    try {
        await updateDoc(doc(db, "faqs", faqId), {
            question: newQuestion,
            answer: newAnswer,
            order: parseInt(newOrder) || 1
        });
        
        showNotification('FAQ updated successfully!');
        loadFAQsAdmin(); // Refresh the list
        
    } catch (error) {
        console.error("Error updating FAQ:", error);
        showNotification('Error updating FAQ.', true);
    }
};

// Delete FAQ
window.deleteFAQ = async function(faqId) {
    if (!confirm("Are you sure you want to delete this FAQ?")) return;
    
    try {
        await deleteDoc(doc(db, "faqs", faqId));
        showNotification('FAQ deleted successfully!');
        loadFAQsAdmin(); // Refresh the list
        
    } catch (error) {
        console.error("Error deleting FAQ:", error);
        showNotification('Error deleting FAQ.', true);
    }
};

// === INITIALIZE ===
document.addEventListener('DOMContentLoaded', () => {
    initAdmin();
});
