import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import { getFirestore, collection, getDocs, addDoc, updateDoc, deleteDoc, doc, onSnapshot, getDoc, setDoc, query, orderBy } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject, listAll } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-storage.js";

const firebaseConfig = {
    apiKey: "AIzaSyAZe6bywYSgnMFZsef1xgfPFQBkw4y7tco",
    authDomain: "sarm-enterprises.firebaseapp.com",
    projectId: "sarm-enterprises",
    storageBucket: "sarm-enterprises.firebasestorage.app",
    messagingSenderId: "790231205096",
    appId: "1:790231205096:web:656c5fc47c6a675e1ef55d",
    measurementId: "G-5M1ZM089KH"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// DOM Elements
const productsContainer = document.getElementById('productsContainer');
const logoElement = document.getElementById('logo');
const adminAccessDiv = document.getElementById('adminAccess');
const adminLink = document.getElementById('adminLink');

// Check Authentication State
onAuthStateChanged(auth, (user) => {
    if (user) {
        console.log('Admin signed in:', user.email);
        if (adminAccessDiv) adminAccessDiv.style.display = 'block';
        if (adminLink) adminLink.style.display = 'flex';
    } else {
        console.log('User is signed out');
        if (adminAccessDiv) adminAccessDiv.style.display = 'none';
        if (adminLink) adminLink.style.display = 'none';
    }
});

async function loadLogo() {
    try {
        const logoElement = document.getElementById('logo');
        if (!logoElement) return;
        
        // Use local logo by default
        logoElement.src = "assets/logo/logo.png";
        logoElement.alt = "SARM ENTERPRISES Logo";
        
        // Optional: You can still check Firestore for a logo path if you want flexibility
        const logoDoc = await getDoc(doc(db, "settings", "logo"));
        if (logoDoc.exists() && logoDoc.data().path) {
            logoElement.src = logoDoc.data().path;
        }
        
    } catch (error) {
        console.log("Using default logo");
    }
}

// ========== NEW PRODUCT DISPLAY FUNCTIONS (WITH MULTIPLE IMAGES, CATEGORIES, ADD TO CART) ==========

// Function to display products with multiple images, categories, and Add to Cart button
function displayProductOnWebsite(product, id) {
    const productItem = document.createElement('div');
    productItem.className = 'product-card';
    productItem.setAttribute('data-category', product.category || 'uncategorized');
    
    // Create images HTML - MULTIPLE IMAGES with carousel
    const images = product.images || [];
    let imagesHTML = '';
    
    if (images.length > 0) {
        imagesHTML = `
            <div class="product-image-slider">
                <div class="slider-main">
                    <img src="assets/products/${images[0]}" 
                         alt="${product.name}" 
                         class="active-slide"
                         onerror="this.onerror=null; this.src='https://via.placeholder.com/300x300?text=Product+Image'">
                </div>
                ${images.length > 1 ? `
                    <div class="slider-thumbnails">
                        ${images.map((img, index) => `
                            <img src="assets/products/${img}" 
                                 alt="${product.name}" 
                                 class="thumbnail ${index === 0 ? 'active' : ''}"
                                 data-index="${index}"
                                 onerror="this.onerror=null; this.src='https://via.placeholder.com/60x60?text=Thumb+${index + 1}'"
                                 onclick="changeProductSlide(this, '${id}')">
                        `).join('')}
                    </div>
                ` : ''}
            </div>
        `;
    } else {
        imagesHTML = `
            <div class="product-image">
                <img src="https://via.placeholder.com/300x300/cccccc/ffffff?text=No+Image" 
                     alt="${product.name}">
            </div>
        `;
    }
    
    // Format category name for display
    const categoryName = product.category ? 
        product.category.split('-').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ') : 'Uncategorized';
    
    productItem.innerHTML = `
        ${imagesHTML}
        <div class="product-info">
            <h3>${product.name}</h3>
            <div class="product-category">
                <i class="fas fa-tag"></i> ${categoryName}
            </div>
            <div class="product-details">
                <p><i class="fas fa-file-alt"></i> ${product.pages} Pages</p>
                <p><i class="fas fa-rupee-sign"></i> ₹${product.price}</p>
                ${product.stock > 0 ? 
                    `<p class="in-stock"><i class="fas fa-check-circle"></i> In Stock (${product.stock})</p>` : 
                    `<p class="out-of-stock"><i class="fas fa-times-circle"></i> Out of Stock</p>`
                }
            </div>
            ${product.description ? `
                <p class="product-description">${product.description.substring(0, 100)}${product.description.length > 100 ? '...' : ''}</p>
            ` : ''}
            ${product.features ? `
                <div class="product-features">
                    <h4>Features:</h4>
                    <ul>
                        ${product.features.split(',').slice(0, 3).map(feature => `<li>${feature.trim()}</li>`).join('')}
                        ${product.features.split(',').length > 3 ? '<li>...</li>' : ''}
                    </ul>
                </div>
            ` : ''}
            <div class="product-actions">
                <button class="btn-primary add-to-cart-btn" onclick="addToCart('${id}', '${product.name.replace(/'/g, "\\'")}', ${product.price}, 'assets/products/${images[0] || ""}')" ${product.stock <= 0 ? 'disabled' : ''}>
                    <i class="fas fa-cart-plus"></i> Add to Cart
                </button>
                <a href="https://wa.me/917006927825?text=Hello%20SARM%20ENTERPRISES,%20I%20would%20like%20to%20order%20${encodeURIComponent(product.name)}%20(Price:%20₹${product.price})" 
                   class="btn-whatsapp" target="_blank" style="width: 100%; text-align: center; margin-top: 10px; display: flex; align-items: center; justify-content: center; gap: 8px;">
                    <i class="fab fa-whatsapp"></i> Order on WhatsApp
                </a>
            </div>
        </div>
    `;
    
    return productItem;
}

// Function to change product image slides
function changeProductSlide(thumbnail, productId) {
    const productCard = thumbnail.closest('.product-card');
    const mainImage = productCard.querySelector('.active-slide');
    const allThumbnails = productCard.querySelectorAll('.thumbnail');
    
    // Update main image
    mainImage.src = thumbnail.src;
    
    // Update active thumbnail
    allThumbnails.forEach(thumb => thumb.classList.remove('active'));
    thumbnail.classList.add('active');
}

// Function to load and display products on main website
async function loadWebsiteProducts() {
    try {
        const productsRef = collection(db, "products");
        const q = query(productsRef, orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);
        
        const productsContainer = document.getElementById('productsContainer');
        
        if (!productsContainer) return;
        
        if (productsContainer) {
            productsContainer.innerHTML = '<div class="loading-products" style="text-align: center; padding: 50px; grid-column: 1 / -1;"><i class="fas fa-spinner fa-spin" style="font-size: 40px; color: #667eea;"></i><p>Loading products...</p></div>';
        }
        
        const productsData = [];
        
        querySnapshot.forEach((doc) => {
            const product = doc.data();
            const productId = doc.id;
            
            productsData.push({ id: productId, ...product });
            
            if (productsContainer) {
                const productElement = displayProductOnWebsite(product, productId);
                productsContainer.appendChild(productElement);
            }
        });
        
        // Clear loading message
        if (productsContainer && productsData.length > 0) {
            // Remove loading message
            const loadingDiv = productsContainer.querySelector('.loading-products');
            if (loadingDiv) loadingDiv.remove();
        }
        
        // Create category filter if products exist
        if (productsData.length > 0) {
            createCategoryFilter(productsData);
        } else {
            if (productsContainer) {
                productsContainer.innerHTML = '<p class="error-message">No products found. Please add products from admin panel.</p>';
            }
        }
        
    } catch (error) {
        console.error("Error loading products for website:", error);
        if (productsContainer) {
            productsContainer.innerHTML = '<p class="error-message">Error loading products. Please try again later.</p>';
        }
    }
}

// Function to create category filter on main website
function createCategoryFilter(productsData) {
    const filterContainer = document.getElementById('categoryFilter');
    if (!filterContainer) return;
    
    // Get unique categories from products
    const categories = ['all'];
    productsData.forEach(product => {
        if (product.category && !categories.includes(product.category)) {
            categories.push(product.category);
        }
    });
    
    // Create filter buttons
    filterContainer.innerHTML = `
        <button class="category-filter-btn active" data-category="all">
            <i class="fas fa-th-large"></i> All Products
        </button>
    `;
    
    categories.forEach(category => {
        if (category !== 'all') {
            const formattedCategory = category.split('-').map(word => 
                word.charAt(0).toUpperCase() + word.slice(1)
            ).join(' ');
            
            const button = document.createElement('button');
            button.className = 'category-filter-btn';
            button.innerHTML = `<i class="fas fa-tag"></i> ${formattedCategory}`;
            button.setAttribute('data-category', category);
            
            button.addEventListener('click', function() {
                // Remove active class from all buttons
                document.querySelectorAll('.category-filter-btn').forEach(btn => {
                    btn.classList.remove('active');
                });
                
                // Add active class to clicked button
                this.classList.add('active');
                
                // Filter products
                filterProductsByCategory(category);
            });
            
            filterContainer.appendChild(button);
        }
    });
}

// Function to filter products by category
function filterProductsByCategory(category) {
    const productCards = document.querySelectorAll('.product-card');
    
    productCards.forEach(card => {
        const productCategory = card.getAttribute('data-category');
        
        if (category === 'all' || productCategory === category) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
}

// Add to Cart function
async function addToCart(productId, productName, price, imageUrl) {
    try {
        // Get current cart from localStorage
        let cart = JSON.parse(localStorage.getItem('cart')) || [];
        
        // Check if product already exists in cart
        const existingItemIndex = cart.findIndex(item => item.id === productId);
        
        if (existingItemIndex >= 0) {
            // Update quantity
            cart[existingItemIndex].quantity += 1;
        } else {
            // Add new item
            cart.push({
                id: productId,
                name: productName,
                price: price,
                image: imageUrl,
                quantity: 1
            });
        }
        
        // Save back to localStorage
        localStorage.setItem('cart', JSON.stringify(cart));
        
        // Update cart count
        updateCartCount();
        
        // Show success notification
        showNotification(`${productName} added to cart!`, false);
        
    } catch (error) {
        console.error('Error adding to cart:', error);
        showNotification('Error adding item to cart. Please try again.', true);
    }
}

// Update cart count in header
function updateCartCount() {
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    const totalItems = cart.reduce((total, item) => total + item.quantity, 0);
    
    const cartCountElements = document.querySelectorAll('.cart-count');
    cartCountElements.forEach(element => {
        element.textContent = totalItems;
        element.style.display = totalItems > 0 ? 'inline-block' : 'none';
    });
}

// Function to view product details
function viewProductDetails(productId) {
    // Redirect to product details page or show modal
    window.location.href = `product-details.html?id=${productId}`;
}

// Real-time listener for products (NEW VERSION)
function setupProductsListener() {
    if (!productsContainer) return;
    
    try {
        const productsRef = collection(db, "products");
        const q = query(productsRef, orderBy("createdAt", "desc"));
        
        onSnapshot(q, (snapshot) => {
            const productsData = [];
            
            snapshot.forEach((doc) => {
                productsData.push({ id: doc.id, ...doc.data() });
            });
            
            // Clear and reload products
            if (productsContainer) {
                productsContainer.innerHTML = '';
                
                productsData.forEach((product) => {
                    const productElement = displayProductOnWebsite(product, product.id);
                    productsContainer.appendChild(productElement);
                });
                
                // Recreate category filter
                createCategoryFilter(productsData);
            }
        });
    } catch (error) {
        console.error("Error setting up products listener:", error);
    }
}

// ========== END OF NEW PRODUCT FUNCTIONS ==========

// Load Quotes with error handling
async function loadQuotes() {
    try {
        const quotesContainer = document.querySelector('.hero-quotes');
        if (!quotesContainer) return;
        
        const quotesSnapshot = await getDocs(collection(db, "quotes"));
        
        quotesContainer.innerHTML = '';
        quotesSnapshot.forEach((doc) => {
            const quote = doc.data();
            const quoteElement = document.createElement('div');
            quoteElement.className = 'quote';
            quoteElement.innerHTML = `
                <i class="fas fa-quote-left"></i>
                <p>${quote.text}</p>
            `;
            quotesContainer.appendChild(quoteElement);
        });
        
        // Add default quotes if none exist
        if (quotesSnapshot.empty) {
            const defaultQuotes = [
                "Where Thoughts Find Their Perfect Home",
                "Quality Pages for Lifelong Memories",
                "Your ideas are precious. We provide the perfect canvas"
            ];
            
            defaultQuotes.forEach(text => {
                const quoteElement = document.createElement('div');
                quoteElement.className = 'quote';
                quoteElement.innerHTML = `
                    <i class="fas fa-quote-left"></i>
                    <p>${text}</p>
                `;
                quotesContainer.appendChild(quoteElement);
            });
        }
    } catch (error) {
        console.log("Quotes loading skipped or failed:", error.message);
    }
}

// Show Notification
function showNotification(message, isError = false) {
    const notification = document.createElement('div');
    notification.className = `notification ${isError ? 'error' : ''}`;
    notification.innerHTML = `
        <i class="fas fa-${isError ? 'exclamation-circle' : 'check-circle'}"></i>
        ${message}
    `;
    document.body.appendChild(notification);
    
    notification.style.display = 'block';
    setTimeout(() => {
        notification.style.display = 'none';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Load logo
    loadLogo();
    
    // Load products if on main page (NEW VERSION)
    if (productsContainer) {
        loadWebsiteProducts();
        setupProductsListener();
    }
    
    // Load quotes
    loadQuotes();
    
    // Update cart count
    updateCartCount();
    
    // Mobile menu toggle
    const menuToggle = document.querySelector('.menu-toggle');
    const navMenu = document.querySelector('.nav-menu');
    
    if (menuToggle && navMenu) {
        menuToggle.addEventListener('click', () => {
            navMenu.classList.toggle('active');
        });
    }
});

// Export for admin.js and global access
export { auth, db, storage, showNotification };

// Make functions globally available for onclick events in HTML
window.addToCart = addToCart;
window.changeProductSlide = changeProductSlide;
window.updateCartCount = updateCartCount;
window.viewProductDetails = viewProductDetails;

// Temporary debug code - add this to the end of app.js
document.addEventListener('DOMContentLoaded', function() {
    console.log("Debug: Checking for product images...");
    // Check for images after a short delay to allow them to load
    setTimeout(() => {
        const allImages = document.querySelectorAll('.product-card img');
        console.log(`Debug: Found ${allImages.length} total image elements in product cards.`);
        allImages.forEach((img, index) => {
            console.log(`Image ${index}: src = "${img.src}", complete = ${img.complete}, naturalWidth = ${img.naturalWidth}`);
        });
    }, 1000);
});
