// Step 1: Add these imports at the TOP of the file
import { auth, db, storage, showNotification } from './app.js';
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, onSnapshot, getDoc, setDoc, query, orderBy } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL, deleteObject, listAll } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-storage.js";

// Step 2: DOM Elements - Add these lines
const productForm = document.getElementById('productForm');
const productsList = document.getElementById('productsList');
const logoutBtn = document.getElementById('logoutBtn');
const submitBtn = document.getElementById('submitBtn');
const cancelEdit = document.getElementById('cancelEdit');
const editProductId = document.getElementById('editProductId');
const productImage = document.getElementById('productImage');
const imagePreview = document.getElementById('imagePreview');
const uploadProgress = document.getElementById('uploadProgress');
const uploadProgressBar = document.getElementById('uploadProgressBar');
const imageInfo = document.getElementById('imageInfo');
const imageGallery = document.getElementById('imageGallery');
const logoUpload = document.getElementById('logoUpload');
const logoPreview = document.getElementById('logoPreview');
const uploadLogoBtn = document.getElementById('uploadLogoBtn');

// Chart variable
let stockChart;
let selectedImageFile = null;
let selectedLogoFile = null;

// Step 3: Initialize Admin Dashboard - Add this function
async function initAdmin() {
    // Check authentication
    auth.onAuthStateChanged((user) => {
        if (!user) {
            // Not logged in, redirect to login page
            window.location.href = 'admin-login.html';
            return;
        }
        
        console.log('Admin logged in:', user.email);
        setupAdmin();
    });
}

// Step 4: Setup admin after login - Add this function
async function setupAdmin() {
    // Setup logout button
    logoutBtn.addEventListener('click', handleLogout);
    
    // Load products
    loadProducts();
    loadQuotes();
    loadGalleryImages();
    loadCurrentLogo();
    
    // Setup form submission
    if (productForm) {
        productForm.addEventListener('submit', handleProductSubmit);
    }
    
    // Setup image selection
    if (productImage) {
        productImage.addEventListener('change', (e) => {
            selectedImageFile = e.target.files[0];
            if (selectedImageFile) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    imagePreview.src = e.target.result;
                    imageInfo.innerHTML = `
                        <div>
                            <strong>${selectedImageFile.name}</strong><br>
                            <small>${(selectedImageFile.size / 1024).toFixed(2)} KB</small>
                        </div>
                    `;
                };
                reader.readAsDataURL(selectedImageFile);
            }
        });
    }
    
    // Setup logo selection
    if (logoUpload) {
        logoUpload.addEventListener('change', (e) => {
            selectedLogoFile = e.target.files[0];
            if (selectedLogoFile) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    logoPreview.src = e.target.result;
                };
                reader.readAsDataURL(selectedLogoFile);
            }
        });
    }
    
    // Setup logo upload
    if (uploadLogoBtn) {
        uploadLogoBtn.addEventListener('click', uploadLogo);
    }
    
    // Cancel edit button
    if (cancelEdit) {
        cancelEdit.addEventListener('click', () => {
            resetForm();
        });
    }
    
    // Setup quote button
    const addQuoteBtn = document.getElementById('addQuoteBtn');
    if (addQuoteBtn) {
        addQuoteBtn.addEventListener('click', addQuote);
    }
}

// Step 5: Handle logout - Add this function
async function handleLogout() {
    try {
        await auth.signOut();
        window.location.href = 'index.html';
    } catch (error) {
        console.error('Logout error:', error);
        showNotification('Error logging out. Please try again.', true);
    }
}

// Step 6: KEEP ALL YOUR EXISTING FUNCTIONS BELOW HERE

// Handle Product Form Submission with Image Upload
async function handleProductSubmit(e) {
    e.preventDefault();
    
    let imageUrl = '';
    
    // If there's a new image file, upload it
    if (selectedImageFile) {
        try {
            imageUrl = await uploadImage(selectedImageFile);
        } catch (error) {
            console.error('Error uploading image:', error);
            showNotification('Error uploading image. Please try again.', true);
            return;
        }
    }
    
    const productData = {
        name: document.getElementById('productName').value,
        pages: parseInt(document.getElementById('productPages').value),
        price: parseFloat(document.getElementById('productPrice').value),
        stock: parseInt(document.getElementById('productStock').value),
        description: document.getElementById('productDescription').value || '',
        updatedAt: new Date().toISOString()
    };
    
    // Only add imageUrl if we have one
    if (imageUrl) {
        productData.imageUrl = imageUrl;
    }
    
    try {
        if (editProductId.value) {
            // Keep existing image if no new image uploaded
            if (!imageUrl) {
                const existingProduct = await getDoc(doc(db, "products", editProductId.value));
                if (existingProduct.exists() && existingProduct.data().imageUrl) {
                    productData.imageUrl = existingProduct.data().imageUrl;
                }
            }
            
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
        if (imageGallery) {
            loadGalleryImages(); // Refresh gallery
        }
    } catch (error) {
        console.error('Error saving product:', error);
        showNotification('Error saving product. Please try again.', true);
    }
}

// Upload Image to Firebase Storage
async function uploadImage(file) {
    return new Promise(async (resolve, reject) => {
        try {
            if (uploadProgress) {
                uploadProgress.style.display = 'block';
                uploadProgressBar.style.width = '0%';
                uploadProgressBar.textContent = '0%';
            }
            
            // Create a unique filename
            const timestamp = Date.now();
            const fileName = `product_${timestamp}_${file.name}`;
            const storageRef = ref(storage, `products/${fileName}`);
            
            // Simulate progress
            let progress = 0;
            const progressInterval = setInterval(() => {
                progress += 10;
                if (progress <= 90 && uploadProgressBar) {
                    uploadProgressBar.style.width = `${progress}%`;
                    uploadProgressBar.textContent = `${progress}%`;
                }
            }, 100);
            
            // Upload file
            const snapshot = await uploadBytes(storageRef, file);
            clearInterval(progressInterval);
            
            // Get download URL
            const downloadURL = await getDownloadURL(snapshot.ref);
            
            // Update progress to 100%
            if (uploadProgressBar) {
                uploadProgressBar.style.width = '100%';
                uploadProgressBar.textContent = '100%';
            }
            
            setTimeout(() => {
                if (uploadProgress) {
                    uploadProgress.style.display = 'none';
                }
            }, 500);
            
            resolve(downloadURL);
        } catch (error) {
            if (uploadProgress) {
                uploadProgress.style.display = 'none';
            }
            reject(error);
        }
    });
}

// Upload Logo
async function uploadLogo() {
    if (!selectedLogoFile) {
        showNotification('Please select a logo file first', true);
        return;
    }
    
    try {
        const logoUploadProgress = document.getElementById('logoUploadProgress');
        const logoUploadProgressBar = document.getElementById('logoUploadProgressBar');
        
        if (logoUploadProgress) {
            logoUploadProgress.style.display = 'block';
            logoUploadProgressBar.style.width = '0%';
            logoUploadProgressBar.textContent = '0%';
        }
        
        // Create a unique filename
        const timestamp = Date.now();
        const fileName = `logo_${timestamp}_${selectedLogoFile.name}`;
        const storageRef = ref(storage, `logo/${fileName}`);
        
        // Upload file
        const snapshot = await uploadBytes(storageRef, selectedLogoFile);
        
        // Get download URL
        const downloadURL = await getDownloadURL(snapshot.ref);
        
        // Save to Firestore
        await setDoc(doc(db, "settings", "logo"), {
            url: downloadURL,
            updatedAt: new Date().toISOString()
        });
        
        // Update progress
        if (logoUploadProgressBar) {
            logoUploadProgressBar.style.width = '100%';
            logoUploadProgressBar.textContent = '100%';
        }
        
        setTimeout(() => {
            if (logoUploadProgress) {
                logoUploadProgress.style.display = 'none';
            }
            showNotification('Logo uploaded successfully!');
            loadCurrentLogo();
        }, 500);
        
    } catch (error) {
        console.error('Error uploading logo:', error);
        showNotification('Error uploading logo. Please try again.', true);
    }
}

// Load Gallery Images
async function loadGalleryImages() {
    try {
        const listRef = ref(storage, 'products/');
        const result = await listAll(listRef);
        
        if (imageGallery) {
            imageGallery.innerHTML = '';
            
            for (const itemRef of result.items) {
                const url = await getDownloadURL(itemRef);
                const imgElement = document.createElement('img');
                imgElement.src = url;
                imgElement.className = 'gallery-image';
                imgElement.title = itemRef.name;
                imgElement.onclick = () => selectGalleryImage(url);
                imageGallery.appendChild(imgElement);
            }
        }
    } catch (error) {
        console.error('Error loading gallery:', error);
    }
}

// Select image from gallery
function selectGalleryImage(url) {
    if (imagePreview) {
        imagePreview.src = url;
        imageInfo.innerHTML = '<div><strong>Gallery Image</strong><br><small>Click to select</small></div>';
        selectedImageFile = null; // Clear file selection
    }
}

// Load Current Logo
async function loadCurrentLogo() {
    try {
        const logoDoc = await getDoc(doc(db, "settings", "logo"));
        if (logoDoc.exists() && logoDoc.data().url && logoPreview) {
            logoPreview.src = logoDoc.data().url;
        }
    } catch (error) {
        console.error('Error loading logo:', error);
    }
}

// Load Products
function loadProducts() {
    onSnapshot(collection(db, "products"), (snapshot) => {
        if (productsList) {
            productsList.innerHTML = '';
        }
        let totalProducts = 0;
        let lowStockCount = 0;
        const productsData = [];
        
        snapshot.forEach((doc) => {
            const product = doc.data();
            totalProducts++;
            if (product.stock <= 10) lowStockCount++;
            productsData.push({ id: doc.id, ...product });
            if (productsList) {
                createProductListItem(product, doc.id);
            }
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
    });
}

// Create Product List Item
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
    
    productItem.innerHTML = `
        <img src="${product.imageUrl || 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?ixlib=rb-4.0.3'}" 
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
    const editBtn = productItem.querySelector('.edit-btn');
    const deleteBtn = productItem.querySelector('.delete-btn');
    
    if (editBtn) {
        editBtn.addEventListener('click', () => editProduct(id, product));
    }
    if (deleteBtn) {
        deleteBtn.addEventListener('click', () => deleteProduct(id, product.name));
    }
}

// Edit Product
function editProduct(id, product) {
    document.getElementById('productName').value = product.name;
    document.getElementById('productPages').value = product.pages;
    document.getElementById('productPrice').value = product.price;
    document.getElementById('productStock').value = product.stock;
    document.getElementById('productDescription').value = product.description || '';
    editProductId.value = id;
    
    // Set image preview
    if (product.imageUrl && imagePreview) {
        imagePreview.src = product.imageUrl;
        imageInfo.innerHTML = '<div><strong>Current Image</strong><br><small>Select new image to change</small></div>';
    }
    
    if (submitBtn) {
        submitBtn.innerHTML = '<i class="fas fa-save"></i> Update Product';
    }
    if (cancelEdit) {
        cancelEdit.style.display = 'inline-block';
    }
    
    // Scroll to form
    const formCard = document.querySelector('.form-card');
    if (formCard) {
        formCard.scrollIntoView({ behavior: 'smooth' });
    }
}

// Delete Product
async function deleteProduct(id, productName) {
    if (confirm(`Are you sure you want to delete "${productName}"?`)) {
        try {
            // First, get the product to check if it has an image in storage
            const productDoc = await getDoc(doc(db, "products", id));
            if (productDoc.exists()) {
                const product = productDoc.data();
                
                // Delete image from storage if it exists
                if (product.imageUrl) {
                    try {
                        // Extract path from URL and create storage ref
                        const imagePath = decodeURIComponent(product.imageUrl.split('/o/')[1].split('?')[0]);
                        const imageRef = ref(storage, imagePath);
                        await deleteObject(imageRef);
                    } catch (storageError) {
                        console.error('Error deleting image:', storageError);
                        // Continue with product deletion even if image deletion fails
                    }
                }
                
                // Delete product from Firestore
                await deleteDoc(doc(db, "products", id));
                showNotification('Product deleted successfully!');
                if (imageGallery) {
                    loadGalleryImages(); // Refresh gallery
                }
            }
        } catch (error) {
            console.error('Error deleting product:', error);
            showNotification('Error deleting product. Please try again.', true);
        }
    }
}

// Reset Form
function resetForm() {
    if (productForm) {
        productForm.reset();
    }
    editProductId.value = '';
    if (imagePreview) {
        imagePreview.src = '';
    }
    if (imageInfo) {
        imageInfo.innerHTML = '';
    }
    selectedImageFile = null;
    if (submitBtn) {
        submitBtn.innerHTML = '<i class="fas fa-save"></i> Add Product';
    }
    if (cancelEdit) {
        cancelEdit.style.display = 'none';
    }
}

// Load Quotes
async function loadQuotes() {
    onSnapshot(collection(db, "quotes"), (snapshot) => {
        const quotesList = document.getElementById('quotesList');
        if (!quotesList) return;
        
        quotesList.innerHTML = '';
        
        snapshot.forEach((doc) => {
            const quote = doc.data();
            createQuoteItem(quote, doc.id);
        });
    });
}

// Create Quote Item
function createQuoteItem(quote, id) {
    const quoteItem = document.createElement('div');
    quoteItem.className = 'quote-card';
    quoteItem.style.margin = '10px 0';
    
    quoteItem.innerHTML = `
        <p>"${quote.text}"</p>
        <button class="btn-secondary delete-quote-btn" data-id="${id}" 
                style="margin-top: 10px; padding: 5px 10px;">
            <i class="fas fa-trash"></i> Delete
        </button>
    `;
    
    const quotesList = document.getElementById('quotesList');
    if (quotesList) {
        quotesList.appendChild(quoteItem);
    }
    
    const deleteBtn = quoteItem.querySelector('.delete-quote-btn');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', () => deleteQuote(id));
    }
}

// Add Quote
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
        showNotification('Error adding quote. Please try again.', true);
    }
}

// Delete Quote
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

// Update Stock Chart
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
    
    if (stockChart) {
        stockChart.destroy();
    }
    
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

// Initialize default products
async function initializeDefaultProducts() {
    try {
        const querySnapshot = await getDocs(collection(db, "products"));
        
        if (querySnapshot.empty) {
            const defaultProducts = [
                {
                    name: "Spiral Notebook 200 Pages",
                    pages: 200,
                    price: 69,
                    stock: 100,
                    description: "Premium 200 pages spiral notebook with quality paper"
                },
                {
                    name: "Spiral Notebook 250 Pages",
                    pages: 250,
                    price: 85,
                    stock: 80,
                    description: "Premium 250 pages spiral notebook"
                },
                {
                    name: "Spiral Notebook 300 Pages",
                    pages: 300,
                    price: 105,
                    stock: 60,
                    description: "Premium 300 pages spiral notebook"
                },
                {
                    name: "Spiral Notebook 400 Pages",
                    pages: 400,
                    price: 129,
                    stock: 40,
                    description: "Premium 400 pages spiral notebook"
                },
                {
                    name: "Spiral Notebook 500 Pages",
                    pages: 500,
                    price: 135,
                    stock: 30,
                    description: "Premium 500 pages spiral notebook"
                }
            ];
            
            for (const product of defaultProducts) {
                await addDoc(collection(db, "products"), {
                    ...product,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                });
            }
            
            console.log('Default products added');
        }
    } catch (error) {
        console.error('Error initializing products:', error);
    }
}

// Initialize default quotes
async function initializeDefaultQuotes() {
    try {
        const querySnapshot = await getDocs(collection(db, "quotes"));
        
        if (querySnapshot.empty) {
            const defaultQuotes = [
                { text: "Where Thoughts Find Their Perfect Home" },
                { text: "Quality Pages for Lifelong Memories" },
                { text: "Your ideas are precious. We provide the perfect canvas to preserve them." },
                { text: "Writing transforms thoughts into treasures" },
                { text: "Every page tells a story, every notebook holds a journey" },
                { text: "Capture your dreams, one page at a time" },
                { text: "Quality you can write on, durability you can rely on" }
            ];
            
            for (const quote of defaultQuotes) {
                await addDoc(collection(db, "quotes"), {
                    ...quote,
                    createdAt: new Date().toISOString()
                });
            }
            
            console.log('Default quotes added');
        }
    } catch (error) {
        console.error('Error initializing quotes:', error);
    }
}

// Step 7: Add this at the VERY BOTTOM of the file
document.addEventListener('DOMContentLoaded', () => {
    initAdmin();
});
