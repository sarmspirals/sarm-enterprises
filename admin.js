// === IMPORTS ===
import { auth, db, showNotification, getImagePath } from './app.js';
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

// === FIXED: USE SAME IMAGE PATH FUNCTION FROM APP.JS ===
function getImageUrl(filename) {
    // Use the same function from app.js to ensure consistency
    return getImagePath(filename);
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
            // Store only filename (remove any path prefix)
            let filename = value;
            
            // If filename has assets/products/ prefix, remove it
            if (filename.startsWith('assets/products/')) {
                filename = filename.replace('assets/products/', '');
            }
            
            // If it's a full URL, keep it as-is (for placeholders)
            if (!filename.startsWith('http://') && !filename.startsWith('https://') && !filename.startsWith('data:')) {
                imageFilenames.push(filename);
            }
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
                
                // Set images (just filenames, no path)
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

// Rest of admin.js remains the same...
// [Keep all other functions from your original admin.js]
