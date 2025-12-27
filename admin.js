// === IMPORTS ===
import { auth, db, showNotification } from './app.js';
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, onSnapshot, query, where, orderBy } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

// === DOM ELEMENTS ===
const productForm = document.getElementById('productForm');
const productsList = document.getElementById('productsList');
const logoutBtn = document.getElementById('logoutBtn');
const submitBtn = document.getElementById('submitBtn');
const cancelEdit = document.getElementById('cancelEdit');
const editProductId = document.getElementById('editProductId');
// Note: 'imagePreview' and 'imageInfo' are still used but referenced by ID

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
    loadPendingFeedback();
    loadFAQsAdmin();

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
    
    // Add event listeners for image preview on the 4 text inputs
    ['productImage1', 'productImage2', 'productImage3', 'productImage4'].forEach(id => {
        const input = document.getElementById(id);
        if (input) {
            input.addEventListener('input', previewImagesFromInputs);
        }
    });
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

// === NEW: Function to preview images from text inputs ===
function previewImagesFromInputs() {
    const previewContainer = document.getElementById('multipleImagePreview');
    const imageInfo = document.getElementById('imageInfo');
    if (!previewContainer || !imageInfo) return;
    
    previewContainer.innerHTML = '';
    
    // Collect filenames from all 4 inputs
    const imageFilenames = [];
    for (let i = 1; i <= 4; i++) {
        const input = document.getElementById(`productImage${i}`);
        if (input && input.value.trim()) {
            imageFilenames.push(input.value.trim());
        }
    }
    
    // Show previews
    if (imageFilenames.length > 0) {
        imageInfo.innerHTML = `<strong>✅ ${imageFilenames.length} image(s) configured</strong><br>
                               <small>Image 1 will be the main thumbnail. Make sure files exist in <code>assets/products/</code>.</small>`;
        
        imageFilenames.forEach((filename, index) => {
            const imgContainer = document.createElement('div');
            imgContainer.style.cssText = `
                position: relative;
                width: 100px;
                margin: 5px;
            `;
            
            // Create image element
            const img = document.createElement('img');
            // Construct the full local path for preview
            img.src = `assets/products/${filename}`;
            img.alt = `Preview ${index + 1}`;
            img.style.cssText = `
                width: 100px;
                height: 100px;
                object-fit: cover;
                border-radius: 5px;
                border: 2px solid ${index === 0 ? '#3498db' : '#ddd'};
            `;
            // Handle missing image files gracefully
            img.onerror = function() {
                this.style.borderColor = '#e74c3c';
                this.style.opacity = '0.7';
            };
            
            // Add caption
            const caption = document.createElement('div');
            caption.textContent = `Img ${index + 1}`;
            caption.style.cssText = `
                font-size: 0.7rem;
                text-align: center;
                margin-top: 5px;
                color: #666;
            `;
            
            imgContainer.appendChild(img);
            imgContainer.appendChild(caption);
            previewContainer.appendChild(imgContainer);
        });
    } else {
        // No filenames entered yet
        imageInfo.innerHTML = `<strong>📝 Image Guidelines:</strong><br>
                               1. Upload images to <code>assets/products/</code> folder first.<br>
                               2. Enter exact filenames above.<br>
                               3. Image 1 is the main thumbnail.`;
    }
}

// === UPDATED: Main product submission function ===
async function handleProductSubmit(e) {
    e.preventDefault();
    
    // 1. Collect images from the 4 text inputs
    const imageFilenames = [];
    for (let i = 1; i <= 4; i++) {
        const input = document.getElementById(`productImage${i}`);
        if (input && input.value.trim()) {
            imageFilenames.push(input.value.trim());
        }
    }
    
    // Validate at least one image
    if (imageFilenames.length === 0) {
        showNotification('Please enter at least one image filename (Image 1 is required).', true);
        return;
    }
    
    // 2. Build array of full local paths
    const imagePaths = imageFilenames.map(filename => `assets/products/${filename}`);
    
    // 3. Get pages value - can be empty for stationery
    const pagesInput = document.getElementById('productPages');
    const pagesValue = pagesInput.value.trim();
    
    // 4. Create the product data object
    const productData = {
        name: document.getElementById('productName').value,
        // Store pages as a number if provided, otherwise as `null`
        pages: pagesValue ? parseInt(pagesValue) : null,
        price: parseFloat(document.getElementById('productPrice').value),
        stock: parseInt(document.getElementById('productStock').value),
        description: document.getElementById('productDescription').value || '',
        // Store the array of image paths
        images: imagePaths,
        updatedAt: new Date().toISOString()
    };
    
    // 5. Save to Firestore
    try {
        if (editProductId.value) {
            // Update existing product
            await updateDoc(doc(db, "products", editProductId.value), productData);
            showNotification('Product updated successfully!');
        } else {
            // Add new product
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

// === UPDATED: Product display function for admin panel ===
function createProductListItem(product, id) {
    const productItem = document.createElement('div');
    productItem.className = 'product-card';
    
    // Stock status logic
    let stockClass = 'stock-in';
    let stockText = 'In Stock';
    if (product.stock <= 0) {
        stockClass = 'stock-out';
        stockText = 'Out of Stock';
    } else if (product.stock <= 10) {
        stockClass = 'stock-low';
        stockText = 'Low Stock';
    }
    
    // --- IMAGE HANDLING: Supports old and new format ---
    let productImages = [];
    let imageCount = 0;
    let mainImageUrl = 'assets/products/default-notebook.jpg';
    
    if (product.images && Array.isArray(product.images) && product.images.length > 0) {
        // NEW FORMAT: Product has an 'images' array
        productImages = product.images;
        imageCount = productImages.length;
        mainImageUrl = productImages[0];
    } else if (product.imagePath) {
        // OLD FORMAT (Backward Compatibility): Product has single 'imagePath'
        productImages = [product.imagePath];
        imageCount = 1;
        mainImageUrl = product.imagePath;
    } else {
        // No image defined, use default
        productImages = ['assets/products/default-notebook.jpg'];
        imageCount = 1;
    }
    
    // --- PAGES DISPLAY: Different label for notebooks vs stationery ---
    let pagesOrTypeHtml = '';
    if (product.pages) {
        pagesOrTypeHtml = `<p><i class="fas fa-file-alt"></i> ${product.pages} Pages</p>`;
    } else {
        // Product has no pages (like a pen or umbrella)
        pagesOrTypeHtml = `<p><i class="fas fa-tag"></i> Stationery Item</p>`;
    }
    
    productItem.innerHTML = `
        <div style="position: relative;">
            <img src="${mainImageUrl}" 
                 alt="${product.name}" 
                 class="product-image"
                 style="width: 100%; height: 200px; object-fit: cover; border-radius: 5px;"
                 onerror="this.src='assets/products/default-notebook.jpg'">
            
            ${imageCount > 1 ? `
                <div style="position: absolute; top: 10px; right: 10px; 
                            background: rgba(0,0,0,0.7); color: white; 
                            padding: 3px 8px; border-radius: 10px; font-size: 0.8rem;">
                    <i class="fas fa-images"></i> ${imageCount}
                </div>
            ` : ''}
        </div>
        <div class="product-info">
            <h3 class="product-title">${product.name}</h3>
            <div class="product-price">₹${product.price}</div>
            <span class="product-stock ${stockClass}">
                <i class="fas fa-box"></i> ${stockText} (${product.stock})
            </span>
            ${pagesOrTypeHtml}
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
    
    // Add event listeners for edit and delete
    productItem.querySelector('.edit-btn')?.addEventListener('click', () => editProduct(id, product));
    productItem.querySelector('.delete-btn')?.addEventListener('click', () => deleteProduct(id, product.name));
}

// === UPDATED: Edit product function ===
function editProduct(id, product) {
    // Fill basic fields
    document.getElementById('productName').value = product.name;
    document.getElementById('productPages').value = product.pages || '';
    document.getElementById('productPrice').value = product.price;
    document.getElementById('productStock').value = product.stock;
    document.getElementById('productDescription').value = product.description || '';
    editProductId.value = id;
    
    // --- Populate the 4 image text inputs ---
    // First, clear all 4 inputs
    for (let i = 1; i <= 4; i++) {
        const input = document.getElementById(`productImage${i}`);
        if (input) input.value = '';
    }
    
    // Determine which images to load (support old and new format)
    let imagesToLoad = [];
    if (product.images && Array.isArray(product.images) && product.images.length > 0) {
        imagesToLoad = product.images;
    } else if (product.imagePath) {
        imagesToLoad = [product.imagePath];
    }
    
    // Fill the inputs with just the filename (strip the path)
    imagesToLoad.forEach((fullPath, index) => {
        if (index < 4) { // Only fill first 4 inputs
            const input = document.getElementById(`productImage${index + 1}`);
            if (input) {
                // Extract "filename.jpg" from "assets/products/filename.jpg"
                const filename = fullPath.replace('assets/products/', '');
                input.value = filename;
            }
        }
    });
    
    // Trigger the preview to update
    previewImagesFromInputs();
    
    // Update UI for edit mode
    if (submitBtn) submitBtn.innerHTML = '<i class="fas fa-save"></i> Update Product';
    if (cancelEdit) cancelEdit.style.display = 'inline-block';
    
    // Scroll to the form
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

// === UPDATED: Reset form function ===
function resetForm() {
    if (productForm) productForm.reset();
    editProductId.value = '';
    
    // Clear image previews and reset info text
    const previewContainer = document.getElementById('multipleImagePreview');
    const imageInfo = document.getElementById('imageInfo');
    
    if (previewContainer) previewContainer.innerHTML = '';
    if (imageInfo) {
        imageInfo.innerHTML = `<strong>📝 Image Guidelines:</strong><br>
                               1. Upload images to <code>assets/products/</code> folder first.<br>
                               2. Enter exact filenames above.<br>
                               3. Image 1 is the main thumbnail.`;
    }
    
    if (submitBtn) submitBtn.innerHTML = '<i class="fas fa-save"></i> Add Product';
    if (cancelEdit) cancelEdit.style.display = 'none';
}

// === OTHER ADMIN FUNCTIONS (Mostly unchanged) ===
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
// FEEDBACK MANAGEMENT FUNCTIONS
// ======================================================

async function loadPendingFeedback() {
    try {
        const q = query(
            collection(db, "feedback_submissions"),
            where("status", "==", "pending"),
            orderBy("createdAt", "desc")
        );
        const querySnapshot = await getDocs(q);

        const container = document.getElementById('pendingFeedbackList');
        if (!container) {
            console.log('Feedback container not found on this page');
            return;
        }
        container.innerHTML = '';
        if (querySnapshot.empty) {
            container.innerHTML = '<p style="text-align: center; padding: 2rem; color: #666;">No pending feedback to review.</p>';
            return;
        }
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

window.approveFeedback = async function(feedbackId) {
    if (!confirm("Approve this testimonial to publish it on the website?")) return;
    try {
        await updateDoc(doc(db, "feedback_submissions", feedbackId), { status: "approved" });
        showNotification('Feedback approved and published on the website!');
        loadPendingFeedback();
    } catch (error) {
        console.error("Error approving feedback:", error);
        showNotification('Error approving feedback.', true);
    }
};

window.rejectFeedback = async function(feedbackId) {
    if (!confirm("Reject this submission? It will be deleted.")) return;
    try {
        await deleteDoc(doc(db, "feedback_submissions", feedbackId));
        showNotification('Feedback submission rejected and deleted.');
        loadPendingFeedback();
    } catch (error) {
        console.error("Error rejecting feedback:", error);
        showNotification('Error rejecting feedback.', true);
    }
};

// ============================================
// FAQ MANAGEMENT FUNCTIONS
// ============================================

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
        loadFAQsAdmin();
    } catch (error) {
        console.error("Error adding FAQ:", error);
        showNotification('Error adding FAQ.', true);
    }
};

window.editFAQ = async function(faqId, currentQuestion, currentAnswer, currentOrder) {
    const newQuestion = prompt("Edit question:", currentQuestion);
    if (newQuestion === null) return;
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
        loadFAQsAdmin();
    } catch (error) {
        console.error("Error updating FAQ:", error);
        showNotification('Error updating FAQ.', true);
    }
};

window.deleteFAQ = async function(faqId) {
    if (!confirm("Are you sure you want to delete this FAQ?")) return;
    try {
        await deleteDoc(doc(db, "faqs", faqId));
        showNotification('FAQ deleted successfully!');
        loadFAQsAdmin();
    } catch (error) {
        console.error("Error deleting FAQ:", error);
        showNotification('Error deleting FAQ.', true);
    }
};

// === INITIALIZE ===
document.addEventListener('DOMContentLoaded', () => {
    initAdmin();
});
