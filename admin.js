import { auth, db, handleLogout } from './app.js';
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, onSnapshot } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

// DOM Elements
const productForm = document.getElementById('productForm');
const productsList = document.getElementById('productsList');
const logoutBtn = document.getElementById('logoutBtn');
const submitBtn = document.getElementById('submitBtn');
const cancelEdit = document.getElementById('cancelEdit');
const editProductId = document.getElementById('editProductId');
const newQuote = document.getElementById('newQuote');
const addQuoteBtn = document.getElementById('addQuoteBtn');
const quotesList = document.getElementById('quotesList');

// Chart variable
let stockChart;

// Initialize Admin Dashboard
async function initAdmin() {
    // Check authentication
    if (!auth.currentUser) {
        window.location.href = 'index.html';
        return;
    }
    
    // Setup logout button
    logoutBtn.addEventListener('click', handleLogout);
    
    // Load products
    loadProducts();
    loadQuotes();
    
    // Setup form submission
    productForm.addEventListener('submit', handleProductSubmit);
    
    // Setup quote button
    addQuoteBtn.addEventListener('click', addQuote);
    
    // Cancel edit button
    cancelEdit.addEventListener('click', () => {
        resetForm();
    });
}

// Handle Product Form Submission
async function handleProductSubmit(e) {
    e.preventDefault();
    
    const productData = {
        name: document.getElementById('productName').value,
        pages: parseInt(document.getElementById('productPages').value),
        price: parseFloat(document.getElementById('productPrice').value),
        stock: parseInt(document.getElementById('productStock').value),
        image: document.getElementById('productImage').value || 'default-notebook.jpg',
        description: document.getElementById('productDescription').value || '',
        createdAt: new Date().toISOString()
    };
    
    try {
        if (editProductId.value) {
            // Update existing product
            await updateDoc(doc(db, "products", editProductId.value), productData);
            showSuccess('Product updated successfully!');
        } else {
            // Add new product
            await addDoc(collection(db, "products"), productData);
            showSuccess('Product added successfully!');
        }
        
        resetForm();
    } catch (error) {
        console.error('Error saving product:', error);
        alert('Error saving product. Please try again.');
    }
}

// Load Products
function loadProducts() {
    onSnapshot(collection(db, "products"), (snapshot) => {
        productsList.innerHTML = '';
        let totalProducts = 0;
        let lowStockCount = 0;
        
        snapshot.forEach((doc) => {
            const product = doc.data();
            totalProducts++;
            if (product.stock <= 10) lowStockCount++;
            createProductListItem(product, doc.id);
        });
        
        // Update stats
        document.getElementById('totalProducts').textContent = `${totalProducts} Products`;
        document.getElementById('lowStock').textContent = `${lowStockCount} Low Stock`;
        
        // Update chart
        updateStockChart(snapshot);
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
        <img src="${product.image || 'default-notebook.jpg'}" 
             alt="${product.name}" 
             class="product-image"
             onerror="this.src='https://images.unsplash.com/photo-1544947950-fa07a98d237f?ixlib=rb-4.0.3'">
        <div class="product-info">
            <h3 class="product-title">${product.name}</h3>
            <div class="product-price">₹${product.price}</div>
            <span class="product-stock ${stockClass}">
                <i class="fas fa-box"></i> ${stockText} (${product.stock})
            </span>
            <p>${product.description || 'No description'}</p>
            <div class="admin-actions">
                <button class="btn-primary edit-btn" data-id="${id}">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button class="btn-secondary delete-btn" data-id="${id}">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </div>
        </div>
    `;
    
    productsList.appendChild(productItem);
    
    // Add event listeners
    productItem.querySelector('.edit-btn').addEventListener('click', () => editProduct(id, product));
    productItem.querySelector('.delete-btn').addEventListener('click', () => deleteProduct(id, product.name));
}

// Edit Product
function editProduct(id, product) {
    document.getElementById('productName').value = product.name;
    document.getElementById('productPages').value = product.pages;
    document.getElementById('productPrice').value = product.price;
    document.getElementById('productStock').value = product.stock;
    document.getElementById('productImage').value = product.image || '';
    document.getElementById('productDescription').value = product.description || '';
    editProductId.value = id;
    
    submitBtn.innerHTML = '<i class="fas fa-save"></i> Update Product';
    cancelEdit.style.display = 'inline-block';
    
    // Scroll to form
    document.querySelector('.form-card').scrollIntoView({ behavior: 'smooth' });
}

// Delete Product
async function deleteProduct(id, productName) {
    if (confirm(`Are you sure you want to delete "${productName}"?`)) {
        try {
            await deleteDoc(doc(db, "products", id));
            showSuccess('Product deleted successfully!');
        } catch (error) {
            console.error('Error deleting product:', error);
            alert('Error deleting product. Please try again.');
        }
    }
}

// Reset Form
function resetForm() {
    productForm.reset();
    editProductId.value = '';
    submitBtn.innerHTML = '<i class="fas fa-save"></i> Add Product';
    cancelEdit.style.display = 'none';
}

// Load Quotes
async function loadQuotes() {
    onSnapshot(collection(db, "quotes"), (snapshot) => {
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
    
    quotesList.appendChild(quoteItem);
    
    quoteItem.querySelector('.delete-quote-btn').addEventListener('click', 
        () => deleteQuote(id));
}

// Add Quote
async function addQuote() {
    const text = newQuote.value.trim();
    if (!text) {
        alert('Please enter a quote');
        return;
    }
    
    try {
        await addDoc(collection(db, "quotes"), {
            text: text,
            createdAt: new Date().toISOString()
        });
        
        newQuote.value = '';
        showSuccess('Quote added successfully!');
    } catch (error) {
        console.error('Error adding quote:', error);
        alert('Error adding quote. Please try again.');
    }
}

// Delete Quote
async function deleteQuote(id) {
    if (confirm('Are you sure you want to delete this quote?')) {
        try {
            await deleteDoc(doc(db, "quotes", id));
            showSuccess('Quote deleted successfully!');
        } catch (error) {
            console.error('Error deleting quote:', error);
            alert('Error deleting quote. Please try again.');
        }
    }
}

// Update Stock Chart
function updateStockChart(snapshot) {
    const ctx = document.getElementById('stockChart').getContext('2d');
    
    const products = [];
    const stockData = [];
    
    snapshot.forEach((doc) => {
        const product = doc.data();
        products.push(product.name);
        stockData.push(product.stock);
    });
    
    const colors = stockData.map(stock => {
        if (stock <= 0) return '#e74c3c';
        if (stock <= 10) return '#f39c12';
        return '#27ae60';
    });
    
    if (stockChart) {
        stockChart.destroy();
    }
    
    stockChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: products,
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

// Show Success Message
function showSuccess(message) {
    const successMessage = document.getElementById('successMessage');
    document.getElementById('successText').textContent = message;
    successMessage.style.display = 'flex';
}

// Initialize default products on first load
async function initializeDefaultProducts() {
    try {
        const querySnapshot = await getDocs(collection(db, "products"));
        
        // If no products exist, add default ones
        if (querySnapshot.empty) {
            const defaultProducts = [
                {
                    name: "Spiral Notebook 200 Pages",
                    pages: 200,
                    price: 69,
                    stock: 100,
                    image: "200.jpg",
                    description: "Premium 200 pages spiral notebook"
                },
                {
                    name: "Spiral Notebook 250 Pages",
                    pages: 250,
                    price: 85,
                    stock: 80,
                    image: "250.jpg",
                    description: "Premium 250 pages spiral notebook"
                },
                {
                    name: "Spiral Notebook 300 Pages",
                    pages: 300,
                    price: 105,
                    stock: 60,
                    image: "300.jpg",
                    description: "Premium 300 pages spiral notebook"
                },
                {
                    name: "Spiral Notebook 400 Pages",
                    pages: 400,
                    price: 129,
                    stock: 40,
                    image: "400.jpg",
                    description: "Premium 400 pages spiral notebook"
                },
                {
                    name: "Spiral Notebook 500 Pages",
                    pages: 500,
                    price: 135,
                    stock: 30,
                    image: "500.jpg",
                    description: "Premium 500 pages spiral notebook"
                }
            ];
            
            for (const product of defaultProducts) {
                await addDoc(collection(db, "products"), {
                    ...product,
                    createdAt: new Date().toISOString()
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
                { text: "Every page tells a story, every notebook holds a journey" }
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

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    await initAdmin();
    await initializeDefaultProducts();
    await initializeDefaultQuotes();
});
