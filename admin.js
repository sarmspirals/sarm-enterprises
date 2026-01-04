// === IMPORTS ===
import { auth, db, showNotification } from './app.js';
import { 
    collection, 
    addDoc, 
    getDocs, 
    getDoc, 
    updateDoc, 
    deleteDoc, 
    doc, 
    onSnapshot, 
    query, 
    where, 
    orderBy 
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

// === FIXED: GET CORRECT IMAGE PATH ===
function getImageUrl(filename) {
    // If filename is already a full URL or placeholder, return as-is
    if (filename.includes('http://') || filename.includes('https://') || filename.includes('data:')) {
        return filename;
    }
    
    // If filename has no extension, add .jpg
    if (!filename.includes('.')) {
        filename = filename + '.jpg';
    }
    
    // Return local path for project images
    return `assets/products/${filename}`;
}

// === DOM ELEMENTS ===
const productForm = document.getElementById('productForm');
const productsList = document.getElementById('productsList');
const logoutBtn = document.getElementById('logoutBtn');
const submitBtn = document.getElementById('submitBtn');
const cancelEdit = document.getElementById('cancelEdit');
const editProductId = document.getElementById('editProductId');
const refreshProductsBtn = document.getElementById('refreshProducts');

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
    
    // Load initial data
    await loadProducts();
    await loadCategories();
    await loadQuotes();
    await loadPendingFeedback();
    await loadFAQsAdmin();

    // Setup event listeners
    if (productForm) {
        productForm.addEventListener('submit', handleProductSubmit);
    }
    if (cancelEdit) {
        cancelEdit.addEventListener('click', resetForm);
    }
    
    // Refresh button
    if (refreshProductsBtn) {
        refreshProductsBtn.addEventListener('click', loadProducts);
    }
    
    // Add quote button
    const addQuoteBtn = document.getElementById('addQuoteBtn');
    if (addQuoteBtn) {
        addQuoteBtn.addEventListener('click', addQuote);
    }
    
    // Add FAQ button
    const addFaqBtn = document.getElementById('addFaqBtn');
    if (addFaqBtn) {
        addFaqBtn.addEventListener('click', window.addFAQ);
    }
    
    // Refresh FAQs button
    const refreshFaqsBtn = document.getElementById('refreshFaqsBtn');
    if (refreshFaqsBtn) {
        refreshFaqsBtn.addEventListener('click', loadFAQsAdmin);
    }
    
    // Refresh pending feedback button
    const refreshPendingBtn = document.getElementById('refreshPendingBtn');
    if (refreshPendingBtn) {
        refreshPendingBtn.addEventListener('click', loadPendingFeedback);
    }
    
    // View all feedback button
    const viewAllBtn = document.getElementById('viewAllBtn');
    if (viewAllBtn) {
        viewAllBtn.addEventListener('click', viewAllFeedback);
    }
    
    // Category management
    const addCategoryBtn = document.getElementById('addCategoryBtn');
    if (addCategoryBtn) {
        addCategoryBtn.addEventListener('click', addNewCategory);
    }
    
    // Search and filter products
    const searchProduct = document.getElementById('searchProduct');
    if (searchProduct) {
        searchProduct.addEventListener('input', filterProducts);
    }
    
    const filterCategory = document.getElementById('filterCategory');
    if (filterCategory) {
        filterCategory.addEventListener('change', filterProducts);
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

// === PRODUCT FORM HANDLING ===
async function handleProductSubmit(e) {
    e.preventDefault();
    
    // Get all image filenames from the input groups
    const imageInputs = document.querySelectorAll('.image-url');
    const imageFilenames = [];
    
    imageInputs.forEach(input => {
        const value = input.value.trim();
        if (value) {
            // Store only filename
            imageFilenames.push(value);
        }
    });
    
    // Validate at least one image
    if (imageFilenames.length === 0) {
        showNotification('Please enter at least one image filename.', true);
        return;
    }
    
    // Collect form data
    const productData = {
        name: document.getElementById('productName').value.trim(),
        category: document.getElementById('productCategory').value,
        pages: parseInt(document.getElementById('productPages').value) || 0,
        price: parseFloat(document.getElementById('productPrice').value),
        stock: parseInt(document.getElementById('productStock').value),
        description: document.getElementById('productDescription').value.trim(),
        features: document.getElementById('productFeatures').value.trim(),
        images: imageFilenames,
        updatedAt: new Date().toISOString()
    };
    
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
        loadProducts();
        
    } catch (error) {
        console.error('Error saving product:', error);
        showNotification('Error saving product: ' + error.message, true);
    }
}

// === FIXED PRODUCT DISPLAY IN ADMIN ===
function createProductListItem(product, id) {
    const productItem = document.createElement('div');
    productItem.className = 'admin-product-card';
    productItem.setAttribute('data-category', product.category || 'uncategorized');
    
    // Stock status
    let stockClass = 'in-stock';
    let stockText = 'In Stock';
    if (product.stock <= 0) {
        stockClass = 'out-of-stock';
        stockText = 'Out of Stock';
    } else if (product.stock <= 10) {
        stockClass = 'low-stock';
        stockText = 'Low Stock';
    }
    
    // Format category name for display
    const categoryName = product.category ? 
        product.category.split('-').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ') : 'Uncategorized';
    
    // Create images HTML - MULTIPLE IMAGES
    const images = product.images || [];
    let imagesHTML = '';
    
    if (images.length > 0) {
        images.forEach((img, index) => {
            const imageUrl = getImageUrl(img);
            imagesHTML += `
                <img src="${imageUrl}" 
                     alt="${product.name}" 
                     onerror="this.onerror=null; this.src='https://via.placeholder.com/80x80?text=Image+${index + 1}'"
                     style="width:80px;height:80px;object-fit:contain;border-radius:5px;border:1px solid #ddd;background:white;padding:5px;">
            `;
        });
    } else {
        imagesHTML = '<img src="https://via.placeholder.com/80x80/cccccc/ffffff?text=No+Image" style="width:80px;height:80px;">';
    }
    
    productItem.innerHTML = `
        <div class="admin-product-images">
            ${imagesHTML}
        </div>
        <div class="admin-product-info">
            <h4>${product.name} 
                <span class="product-status ${stockClass}">${stockText}</span>
            </h4>
            <p><strong>Pages:</strong> ${product.pages} | <strong>Price:</strong> ₹${product.price}</p>
            <p><strong>Category:</strong> ${categoryName}</p>
            <p><strong>Stock:</strong> ${product.stock} units</p>
            <p><strong>Images:</strong> ${images.length} image(s)</p>
            
            ${product.description ? `
                <p style="margin-top: 10px; font-size: 14px; color: #666;">
                    ${product.description.length > 100 ? product.description.substring(0, 100) + '...' : product.description}
                </p>
            ` : ''}
            
            <div class="admin-product-actions">
                <button class="btn-small edit-product" onclick="editProduct('${id}')">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button class="btn-small delete-product" onclick="deleteProduct('${id}', '${product.name.replace(/'/g, "\\'")}')">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </div>
        </div>
    `;
    
    if (productsList) {
        productsList.appendChild(productItem);
    }
}

// === EDIT PRODUCT ===
async function editProduct(productId) {
    try {
        const productRef = doc(db, "products", productId);
        const productDoc = await getDoc(productRef);
        
        if (productDoc.exists()) {
            const product = {
                id: productId,
                ...productDoc.data()
            };
            
            // Call global function to set form data
            if (window.setProductFormData) {
                window.setProductFormData(product);
            } else {
                // Fallback
                document.getElementById('productName').value = product.name || '';
                document.getElementById('productCategory').value = product.category || '';
                document.getElementById('productPages').value = product.pages || '';
                document.getElementById('productPrice').value = product.price || '';
                document.getElementById('productStock').value = product.stock || '';
                document.getElementById('productDescription').value = product.description || '';
                document.getElementById('productFeatures').value = product.features || '';
                editProductId.value = productId;
                
                // Set images
                if (window.setImageUrls) {
                    window.setImageUrls(product.images || []);
                }
                
                // Update button text
                document.getElementById('submitBtn').innerHTML = '<i class="fas fa-save"></i> Update Product';
                document.getElementById('cancelEdit').style.display = 'inline-block';
            }
            
            // Scroll to form
            document.querySelector('.form-card').scrollIntoView({ behavior: 'smooth' });
        }
    } catch (error) {
        console.error('Error loading product:', error);
        showNotification('Error loading product: ' + error.message, true);
    }
}

// === DELETE PRODUCT ===
async function deleteProduct(productId, productName) {
    if (confirm(`Are you sure you want to delete "${productName}"?`)) {
        try {
            await deleteDoc(doc(db, "products", productId));
            showNotification('Product deleted successfully!');
            loadProducts();
        } catch (error) {
            console.error('Error deleting product:', error);
            showNotification('Error deleting product: ' + error.message, true);
        }
    }
}

// === RESET FORM ===
function resetForm() {
    if (productForm) productForm.reset();
    editProductId.value = '';
    
    // Reset submit button text
    if (submitBtn) {
        submitBtn.innerHTML = '<i class="fas fa-save"></i> Add Product';
    }
    
    // Hide cancel button
    if (cancelEdit) {
        cancelEdit.style.display = 'none';
    }
    
    // Reset images
    if (window.resetProductForm) {
        window.resetProductForm();
    }
}

// === LOAD PRODUCTS ===
async function loadProducts() {
    try {
        const productsRef = collection(db, "products");
        const q = query(productsRef, orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);
        
        if (productsList) {
            productsList.innerHTML = '';
        }
        
        let totalProducts = 0;
        let lowStockCount = 0;
        const productsData = [];
        
        querySnapshot.forEach((doc) => {
            const product = doc.data();
            const productId = doc.id;
            
            totalProducts++;
            if (product.stock <= 10 && product.stock > 0) {
                lowStockCount++;
            }
            
            productsData.push({ id: productId, ...product });
            createProductListItem(product, productId);
        });
        
        // Update stats
        const totalProductsEl = document.getElementById('totalProducts');
        const lowStockEl = document.getElementById('lowStock');
        
        if (totalProductsEl) {
            totalProductsEl.textContent = `${totalProducts} Products`;
        }
        if (lowStockEl) {
            lowStockEl.textContent = `${lowStockCount} Low Stock`;
        }
        
        // Update chart
        updateStockChart(productsData);
        
        // Update categories in filter
        updateCategoryFilter(productsData);
        
    } catch (error) {
        console.error('Error loading products:', error);
        if (productsList) {
            productsList.innerHTML = `
                <div style="text-align: center; padding: 50px; width: 100%; grid-column: 1 / -1;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 60px; color: #e74c3c; margin-bottom: 20px;"></i>
                    <p style="color: #e74c3c; font-size: 18px;">Error loading products. Please check your connection.</p>
                </div>
            `;
        }
    }
}

// === UPDATE CATEGORY FILTER ===
function updateCategoryFilter(productsData) {
    const filterSelect = document.getElementById('filterCategory');
    if (!filterSelect) return;
    
    // Get unique categories from products
    const categories = ['all'];
    productsData.forEach(product => {
        if (product.category && !categories.includes(product.category)) {
            categories.push(product.category);
        }
    });
    
    // Update filter options
    filterSelect.innerHTML = '<option value="all">All Categories</option>';
    categories.forEach(category => {
        if (category !== 'all') {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category.split('-').map(word => 
                word.charAt(0).toUpperCase() + word.slice(1)
            ).join(' ');
            filterSelect.appendChild(option);
        }
    });
}

// === FILTER PRODUCTS ===
function filterProducts() {
    const searchTerm = document.getElementById('searchProduct')?.value.toLowerCase() || '';
    const categoryFilter = document.getElementById('filterCategory')?.value || 'all';
    
    const productCards = document.querySelectorAll('.admin-product-card');
    
    productCards.forEach(card => {
        const productName = card.querySelector('h4').textContent.toLowerCase();
        const productCategory = card.getAttribute('data-category');
        const productDescription = card.querySelector('p[style*="margin-top: 10px"]')?.textContent.toLowerCase() || '';
        
        const matchesSearch = productName.includes(searchTerm) || productDescription.includes(searchTerm);
        const matchesCategory = categoryFilter === 'all' || productCategory === categoryFilter;
        
        if (matchesSearch && matchesCategory) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
}

// === LOAD CATEGORIES ===
async function loadCategories() {
    try {
        const categoriesRef = collection(db, "categories");
        const querySnapshot = await getDocs(categoriesRef);
        
        const categoriesList = document.getElementById('categoriesList');
        const categorySelect = document.getElementById('productCategory');
        
        if (categoriesList) {
            categoriesList.innerHTML = '';
        }
        
        if (categorySelect) {
            // Keep only the first option
            categorySelect.innerHTML = '<option value="">Select Category</option>';
        }
        
        const categories = [];
        querySnapshot.forEach((doc) => {
            const category = doc.data().name;
            if (category && !categories.includes(category)) {
                categories.push(category);
                
                // Add to categories list
                if (categoriesList) {
                    const categoryTag = document.createElement('div');
                    categoryTag.className = 'category-tag';
                    categoryTag.innerHTML = `
                        ${category}
                        <button onclick="removeCategory('${category}')"><i class="fas fa-times"></i></button>
                    `;
                    categoriesList.appendChild(categoryTag);
                }
                
                // Add to category select
                if (categorySelect) {
                    const option = document.createElement('option');
                    option.value = category;
                    option.textContent = category.split('-').map(word => 
                        word.charAt(0).toUpperCase() + word.slice(1)
                    ).join(' ');
                    categorySelect.appendChild(option);
                }
            }
        });
        
        // Update categories count
        const totalCategoriesEl = document.getElementById('totalCategories');
        if (totalCategoriesEl) {
            totalCategoriesEl.textContent = `${categories.length} Categories`;
        }
        
    } catch (error) {
        console.error('Error loading categories:', error);
    }
}

// === ADD NEW CATEGORY ===
async function addNewCategory() {
    const input = document.getElementById('newCategoryInput');
    let categoryName = input.value.trim().toLowerCase().replace(/\s+/g, '-');
    
    if (!categoryName) {
        showNotification('Please enter a category name', true);
        return;
    }
    
    // Remove special characters
    categoryName = categoryName.replace(/[^a-z0-9-]/g, '');
    
    try {
        // Add to Firestore
        await addDoc(collection(db, "categories"), {
            name: categoryName,
            createdAt: new Date().toISOString()
        });
        
        showNotification('Category added successfully!');
        input.value = '';
        
        // Reload categories
        await loadCategories();
        
    } catch (error) {
        console.error('Error adding category:', error);
        showNotification('Error adding category: ' + error.message, true);
    }
}

// === REMOVE CATEGORY ===
async function removeCategory(categoryName) {
    if (confirm(`Are you sure you want to remove category "${categoryName}"?`)) {
        try {
            // Find and delete category from Firestore
            const categoriesRef = collection(db, "categories");
            const q = query(categoriesRef, where("name", "==", categoryName));
            const querySnapshot = await getDocs(q);
            
            querySnapshot.forEach(async (doc) => {
                await deleteDoc(doc.ref);
            });
            
            showNotification('Category removed successfully!');
            
            // Reload categories
            await loadCategories();
            
        } catch (error) {
            console.error('Error removing category:', error);
            showNotification('Error removing category: ' + error.message, true);
        }
    }
}

// === QUOTES MANAGEMENT ===
async function loadQuotes() {
    try {
        const quotesRef = collection(db, "quotes");
        const q = query(quotesRef, orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);
        
        const quotesList = document.getElementById('quotesList');
        if (!quotesList) return;
        
        quotesList.innerHTML = '';
        
        if (querySnapshot.empty) {
            // Add default quotes if none exist
            const defaultQuotes = [
                "Where Thoughts Find Their Perfect Home",
                "Quality Pages for Lifelong Memories",
                "Writing transforms thoughts into treasures",
                "Your ideas are precious. We provide the perfect canvas to preserve them",
                "From thoughts to tangible memories"
            ];
            
            for (const quoteText of defaultQuotes) {
                await addDoc(collection(db, "quotes"), {
                    text: quoteText,
                    createdAt: new Date().toISOString()
                });
            }
            
            // Reload quotes
            await loadQuotes();
            return;
        }
        
        querySnapshot.forEach((doc) => {
            const quote = doc.data();
            createQuoteItem(quote, doc.id);
        });
        
    } catch (error) {
        console.error('Error loading quotes:', error);
    }
}

function createQuoteItem(quote, id) {
    const quoteItem = document.createElement('div');
    quoteItem.className = 'quote-item';
    
    quoteItem.innerHTML = `
        <span>${quote.text}</span>
        <div class="quote-actions">
            <button class="btn-small edit-quote" onclick="editQuote('${id}', '${quote.text.replace(/'/g, "\\'")}')">
                Edit
            </button>
            <button class="btn-small delete-quote" onclick="deleteQuote('${id}')">
                Delete
            </button>
        </div>
    `;
    
    const quotesList = document.getElementById('quotesList');
    if (quotesList) {
        quotesList.appendChild(quoteItem);
    }
}

async function addQuote() {
    const newQuoteInput = document.getElementById('newQuote');
    const text = newQuoteInput.value.trim();
    
    if (!text) {
        showNotification('Please enter a quote', true);
        return;
    }
    
    try {
        await addDoc(collection(db, "quotes"), {
            text: text,
            createdAt: new Date().toISOString()
        });
        
        newQuoteInput.value = '';
        showNotification('Quote added successfully!');
        
    } catch (error) {
        console.error('Error adding quote:', error);
        showNotification('Error adding quote: ' + error.message, true);
    }
}

async function editQuote(id, currentText) {
    const newText = prompt('Edit quote:', currentText);
    if (newText === null || newText.trim() === '') return;
    
    try {
        await updateDoc(doc(db, "quotes", id), {
            text: newText.trim(),
            updatedAt: new Date().toISOString()
        });
        
        showNotification('Quote updated successfully!');
        
    } catch (error) {
        console.error('Error updating quote:', error);
        showNotification('Error updating quote: ' + error.message, true);
    }
}

async function deleteQuote(id) {
    if (confirm('Are you sure you want to delete this quote?')) {
        try {
            await deleteDoc(doc(db, "quotes", id));
            showNotification('Quote deleted successfully!');
        } catch (error) {
            console.error('Error deleting quote:', error);
            showNotification('Error deleting quote: ' + error.message, true);
        }
    }
}

// === STOCK CHART ===
function updateStockChart(productsData) {
    const ctx = document.getElementById('stockChart');
    if (!ctx) return;
    
    // Destroy existing chart
    if (stockChart) {
        stockChart.destroy();
    }
    
    const productNames = productsData.map(p => p.name.substring(0, 15) + (p.name.length > 15 ? '...' : ''));
    const stockData = productsData.map(p => p.stock);
    const colors = stockData.map(stock => {
        if (stock <= 0) return '#e74c3c';
        if (stock <= 10) return '#f39c12';
        return '#27ae60';
    });
    
    const chartCtx = ctx.getContext('2d');
    stockChart = new Chart(chartCtx, {
        type: 'bar',
        data: {
            labels: productNames,
            datasets: [{
                label: 'Stock Quantity',
                data: stockData,
                backgroundColor: colors,
                borderColor: colors,
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Quantity'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Products'
                    },
                    ticks: {
                        autoSkip: false,
                        maxRotation: 45,
                        minRotation: 45
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });
}

// === FEEDBACK MANAGEMENT ===
async function loadPendingFeedback() {
    try {
        const q = query(
            collection(db, "feedback_submissions"),
            where("status", "==", "pending"),
            orderBy("createdAt", "desc")
        );
        
        const querySnapshot = await getDocs(q);
        const container = document.getElementById('pendingFeedbackList');
        
        if (!container) return;
        
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

async function viewAllFeedback() {
    try {
        const q = query(
            collection(db, "feedback_submissions"),
            orderBy("createdAt", "desc")
        );
        
        const querySnapshot = await getDocs(q);
        const container = document.getElementById('pendingFeedbackList');
        
        if (!container) return;
        
        container.innerHTML = '';
        
        if (querySnapshot.empty) {
            container.innerHTML = '<p style="text-align: center; padding: 2rem; color: #666;">No feedback submissions.</p>';
            return;
        }
        
        querySnapshot.forEach((doc) => {
            const feedback = doc.data();
            const statusColor = feedback.status === 'approved' ? '#27ae60' : 
                              feedback.status === 'pending' ? '#f39c12' : '#e74c3c';
            
            const item = document.createElement('div');
            item.className = 'form-card';
            item.style.marginBottom = '1rem';
            
            item.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: start;">
                    <h4 style="margin: 0;">${feedback.customerName}</h4>
                    <div>
                        <span style="background: ${statusColor}; color: white; padding: 3px 10px; border-radius: 3px; font-size: 0.8rem;">
                            ${feedback.status}
                        </span>
                        <div style="color: #f39c12; font-size: 1.2rem; margin-top: 5px;">
                            ${'★'.repeat(feedback.rating)}${'☆'.repeat(5 - feedback.rating)}
                        </div>
                    </div>
                </div>
                <p><small>Submitted: ${new Date(feedback.createdAt).toLocaleDateString('en-IN')}</small></p>
                <p style="background: #f8f9fa; padding: 1rem; border-radius: 5px; margin: 1rem 0;">
                    "${feedback.message}"
                </p>
                ${feedback.status === 'pending' ? `
                    <div style="display: flex; gap: 10px;">
                        <button class="btn-primary" onclick="window.approveFeedback('${doc.id}')">
                            <i class="fas fa-check"></i> Approve
                        </button>
                        <button class="btn-secondary" onclick="window.rejectFeedback('${doc.id}')">
                            <i class="fas fa-times"></i> Reject
                        </button>
                    </div>
                ` : ''}
            `;
            
            container.appendChild(item);
        });
        
    } catch (error) {
        console.error("Error loading all feedback:", error);
        showNotification('Error loading feedback: ' + error.message, true);
    }
}

window.approveFeedback = async function(feedbackId) {
    if (!confirm("Approve this testimonial to publish it on the website?")) return;
    
    try {
        await updateDoc(doc(db, "feedback_submissions", feedbackId), {
            status: "approved",
            updatedAt: new Date().toISOString()
        });
        
        showNotification('Feedback approved and published on the website!');
        loadPendingFeedback();
        
    } catch (error) {
        console.error("Error approving feedback:", error);
        showNotification('Error approving feedback: ' + error.message, true);
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
        showNotification('Error rejecting feedback: ' + error.message, true);
    }
};

// === FAQ MANAGEMENT ===
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
        
        // Clear form
        document.getElementById('faqQuestion').value = '';
        document.getElementById('faqAnswer').value = '';
        document.getElementById('faqOrder').value = '';
        
        // Reload FAQs
        loadFAQsAdmin();
        
    } catch (error) {
        console.error("Error adding FAQ:", error);
        showNotification('Error adding FAQ: ' + error.message, true);
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
            order: parseInt(newOrder) || 1,
            updatedAt: new Date().toISOString()
        });
        
        showNotification('FAQ updated successfully!');
        loadFAQsAdmin();
        
    } catch (error) {
        console.error("Error updating FAQ:", error);
        showNotification('Error updating FAQ: ' + error.message, true);
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
        showNotification('Error deleting FAQ: ' + error.message, true);
    }
};

// === INITIALIZE ===
document.addEventListener('DOMContentLoaded', () => {
    initAdmin();
});

// Export functions for global access
window.editProduct = editProduct;
window.deleteProduct = deleteProduct;
window.addNewCategory = addNewCategory;
window.removeCategory = removeCategory;
window.editQuote = editQuote;
window.deleteQuote = deleteQuote;
window.loadCategories = loadCategories;
