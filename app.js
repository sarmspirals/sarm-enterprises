import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import { getFirestore, collection, getDocs, addDoc, updateDoc, deleteDoc, doc, onSnapshot, getDoc, setDoc, query, orderBy } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

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

// === FIXED LOGO LOADING ===
async function loadLogo() {
    try {
        const logoElement = document.getElementById('logo');
        if (!logoElement) return;
        
        // Try local logo first
        logoElement.src = "assets/logo/logo.png";
        logoElement.alt = "SARM ENTERPRISES Logo";
        
        // Fallback if local logo fails
        logoElement.onerror = function() {
            this.onerror = null;
            this.src = 'https://images.unsplash.com/photo-1567446537710-0c5ff5a6ac32?ixlib=rb-4.0.3';
        };
        
    } catch (error) {
        console.log("Using fallback logo");
        if (logoElement) {
            logoElement.src = 'https://images.unsplash.com/photo-1567446537710-0c5ff5a6ac32?ixlib=rb-4.0.3';
        }
    }
}

// === FIXED: GET CORRECT IMAGE PATH (NO DUPLICATION) ===
function getImagePath(filename) {
    if (!filename) return 'https://via.placeholder.com/300x300?text=No+Image';
    
    // Already a full URL? Return as-is
    if (filename.startsWith('http') || filename.includes('via.placeholder.com')) {
        return filename;
    }
    
    // Already has path? Return as-is
    if (filename.startsWith('assets/products/')) {
        return filename;
    }
    
    // Just filename? Add path
    return `assets/products/${filename}`;
}

// === FIXED: MULTIPLE IMAGE CAROUSEL FUNCTION WITH VIEW ALL BUTTON ===
function createProductImageCarousel(product, id) {
    const images = product.images || [];
    
    if (images.length === 0) {
        return `
            <div class="product-image-slider">
                <div class="slider-main">
                    <img src="https://via.placeholder.com/300x300/cccccc/ffffff?text=${encodeURIComponent(product.name.substring(0, 20))}" 
                         alt="${product.name}">
                </div>
            </div>
        `;
    }
    
    // If only one image
    if (images.length === 1) {
        const firstImagePath = getImagePath(images[0]);
        const imagesJSON = JSON.stringify(images).replace(/"/g, '&quot;');
        const productJSON = JSON.stringify({
            id: id,
            name: product.name,
            images: images
        }).replace(/"/g, '&quot;').replace(/\\/g, '\\\\');
        
        return `
            <div class="product-image-slider" id="slider-${id}" data-images='${imagesJSON}'>
                <div class="slider-main">
                    <img src="${firstImagePath}" 
                         alt="${product.name}"
                         id="main-image-${id}"
                         onerror="this.onerror=null; this.src='https://via.placeholder.com/300x300?text=${encodeURIComponent(product.name.substring(0, 20))}'">
                </div>
                <button class="view-more-images" onclick="viewAllImages(${productJSON})">
                    <i class="fas fa-expand"></i> View Image
                </button>
            </div>
        `;
    }
    
    // Multiple images - create carousel with view all button
    const firstImagePath = getImagePath(images[0]);
    const imagesJSON = JSON.stringify(images).replace(/"/g, '&quot;');
    const productJSON = JSON.stringify({
        id: id,
        name: product.name,
        images: images
    }).replace(/"/g, '&quot;').replace(/\\/g, '\\\\');
    
    return `
        <div class="product-image-slider" id="slider-${id}" data-images='${imagesJSON}'>
            <div class="slider-main">
                <img src="${firstImagePath}" 
                     alt="${product.name}"
                     id="main-image-${id}"
                     onerror="this.onerror=null; this.src='https://via.placeholder.com/300x300?text=${encodeURIComponent(product.name.substring(0, 20))}'">
            </div>
            <div class="slider-thumbnails" id="thumbs-${id}">
                ${images.map((img, index) => {
                    const thumbPath = getImagePath(img);
                    return `
                        <img src="${thumbPath}" 
                             alt="${product.name} - ${index + 1}"
                             class="thumbnail ${index === 0 ? 'active' : ''}"
                             data-index="${index}"
                             onclick="changeProductImage('${id}', ${index})"
                             onerror="this.onerror=null; this.src='https://via.placeholder.com/60x60?text=${index + 1}'">
                    `;
                }).join('')}
            </div>
            <div class="image-counter">
                <span>1</span> / <span>${images.length}</span>
            </div>
            <button class="view-more-images" onclick="viewAllImages(${productJSON})">
                <i class="fas fa-expand"></i> View All (${images.length})
            </button>
        </div>
    `;
}

// === VIEW ALL IMAGES MODAL ===
window.viewAllImages = function(product) {
    const modal = document.getElementById('imageModal');
    const modalImages = document.getElementById('modalImages');
    
    if (!modal || !modalImages) {
        console.error('Modal elements not found');
        return;
    }
    
    modalImages.innerHTML = '';
    
    const images = product.images || [];
    
    if (images.length === 0) {
        modalImages.innerHTML = `
            <div class="swiper-slide" style="display: flex; align-items: center; justify-content: center; height: 400px;">
                <div style="text-align: center;">
                    <i class="fas fa-image" style="font-size: 60px; color: #ccc; margin-bottom: 20px;"></i>
                    <p style="color: #999;">No images available for this product</p>
                </div>
            </div>
        `;
    } else {
        images.forEach((img, index) => {
            const imageUrl = getImagePath(img);
            modalImages.innerHTML += `
                <div class="swiper-slide">
                    <div style="display: flex; align-items: center; justify-content: center; height: 400px; padding: 20px;">
                        <img src="${imageUrl}" 
                             alt="${product.name} - Image ${index + 1}"
                             style="max-width: 100%; max-height: 100%; object-fit: contain;"
                             onerror="this.onerror=null; this.src='https://via.placeholder.com/500x400?text=Image+${index + 1}'">
                    </div>
                </div>
            `;
        });
    }
    
    // Initialize or update Swiper
    if (window.productImageSwiper) {
        window.productImageSwiper.destroy();
    }
    
    window.productImageSwiper = new Swiper('.productImageSwiper', {
        navigation: {
            nextEl: '.swiper-button-next',
            prevEl: '.swiper-button-prev',
        },
        pagination: {
            el: '.swiper-pagination',
            clickable: true,
        },
        loop: images.length > 1,
        spaceBetween: 10,
        centeredSlides: true,
    });
    
    modal.style.display = 'flex';
};

// === GLOBAL FUNCTION TO CHANGE PRODUCT IMAGES ===
window.changeProductImage = function(productId, index) {
    const productSlider = document.getElementById(`slider-${productId}`);
    if (!productSlider) return;
    
    const mainImage = document.getElementById(`main-image-${productId}`);
    const thumbnails = productSlider.querySelectorAll('.thumbnail');
    const counter = productSlider.querySelector('.image-counter span:first-child');
    
    // Get the product data from the product card or from a data attribute
    const productCard = productSlider.closest('.product-card');
    const imagesAttr = productCard.getAttribute('data-images');
    
    if (!imagesAttr) return;
    
    try {
        const images = JSON.parse(imagesAttr);
        if (images && images[index]) {
            const newImagePath = getImagePath(images[index]);
            mainImage.src = newImagePath;
            
            // Update active thumbnail
            thumbnails.forEach(thumb => {
                thumb.classList.remove('active');
                if (parseInt(thumb.getAttribute('data-index')) === index) {
                    thumb.classList.add('active');
                }
            });
            
            // Update counter
            if (counter) {
                counter.textContent = index + 1;
            }
        }
    } catch (error) {
        console.error('Error changing image:', error);
    }
};

// === FIXED: DISPLAY PRODUCT ON WEBSITE FUNCTION ===
function displayProductOnWebsite(product, id) {
    const productItem = document.createElement('div');
    productItem.className = 'product-card';
    productItem.setAttribute('data-category', product.category || 'uncategorized');
    productItem.setAttribute('data-images', JSON.stringify(product.images || []));
    
    // Create image carousel
    const imagesHTML = createProductImageCarousel(product, id);
    
    // Format category name
    const categoryName = product.category ? 
        product.category.split('-').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ') : 'Uncategorized';
    
    // Get first image for cart
    const firstImagePath = product.images && product.images.length > 0 ? 
        getImagePath(product.images[0]) : '';
    
    // Create WhatsApp message - UPDATED: Removed pages field
    const whatsappMessage = `Hello SARM ENTERPRISES,%0AI would like to order:%0AProduct: ${product.name}%0APrice: ₹${product.price}%0A%0APlease confirm availability and delivery time.`;
    
    productItem.innerHTML = `
        ${imagesHTML}
        <div class="product-info">
            <h3>${product.name}</h3>
            <div class="product-category">
                <i class="fas fa-tag"></i> ${categoryName}
            </div>
            <div class="product-details">
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
                <button class="btn-primary add-to-cart-btn" onclick="addToCart('${id}', '${product.name.replace(/'/g, "\\'")}', ${product.price}, '${firstImagePath}')" ${product.stock <= 0 ? 'disabled' : ''}>
                    <i class="fas fa-cart-plus"></i> Add to Cart
                </button>
                <a href="https://wa.me/917006927825?text=${whatsappMessage}" 
                   class="btn-whatsapp" target="_blank" style="width: 100%; text-align: center; margin-top: 10px; display: flex; align-items: center; justify-content: center; gap: 8px;">
                    <i class="fab fa-whatsapp"></i> Order on WhatsApp
                </a>
            </div>
        </div>
    `;
    
    return productItem;
}

// === LOAD AND DISPLAY PRODUCTS ===
async function loadWebsiteProducts() {
    try {
        console.log("Loading products from Firestore...");
        const productsRef = collection(db, "products");
        const q = query(productsRef, orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);
        
        const productsContainer = document.getElementById('productsContainer');
        
        if (!productsContainer) {
            console.error("Products container not found!");
            return;
        }
        
        console.log(`Found ${querySnapshot.size} products in Firestore`);
        
        // Clear loading message
        productsContainer.innerHTML = '';
        
        if (querySnapshot.empty) {
            productsContainer.innerHTML = `
                <div style="text-align: center; padding: 50px; grid-column: 1 / -1;">
                    <i class="fas fa-book" style="font-size: 60px; color: #ccc; margin-bottom: 20px;"></i>
                    <p style="color: #999; font-size: 18px;">No products available yet.</p>
                    <p style="color: #666; font-size: 14px;">Please add products from the admin panel.</p>
                </div>
            `;
            return;
        }
        
        let productsData = [];
        querySnapshot.forEach((doc) => {
            const product = doc.data();
            const productId = doc.id;
            console.log(`Product: ${product.name}, Images:`, product.images);
            
            productsData.push({ id: productId, ...product });
            const productElement = displayProductOnWebsite(product, productId);
            productsContainer.appendChild(productElement);
        });
        
        // Create category filter
        createCategoryFilter(productsData);
        
    } catch (error) {
        console.error("Error loading products:", error);
        if (productsContainer) {
            productsContainer.innerHTML = `
                <div style="text-align: center; padding: 50px; grid-column: 1 / -1;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 60px; color: #e74c3c; margin-bottom: 20px;"></i>
                    <p style="color: #e74c3c; font-size: 18px;">Error loading products.</p>
                    <p style="color: #666; font-size: 14px;">Please check your internet connection.</p>
                </div>
            `;
        }
    }
}

// === CREATE CATEGORY FILTER ===
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

// === FILTER PRODUCTS BY CATEGORY ===
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

// === LOAD QUOTES ===
async function loadQuotes() {
    try {
        const quotesContainer = document.querySelector('.hero-quotes');
        if (!quotesContainer) return;
        
        const quotesRef = collection(db, "quotes");
        const quotesSnapshot = await getDocs(quotesRef);
        
        quotesContainer.innerHTML = '';
        
        if (quotesSnapshot.empty) {
            // Add default quotes if none exist
            const defaultQuotes = [
                "Where Thoughts Find Their Perfect Home",
                "Quality Pages for Lifelong Memories",
                "Writing transforms thoughts into treasures",
                "Your ideas are precious. We provide the perfect canvas to preserve them",
                "From thoughts to tangible memories"
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
            
        } else {
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
        }
    } catch (error) {
        console.log("Quotes loading error:", error);
        // Don't block the page if quotes fail to load
    }
}

// === SHOW NOTIFICATION ===
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

// === REAL-TIME PRODUCTS LISTENER ===
function setupProductsListener() {
    if (!productsContainer) return;
    
    try {
        const productsRef = collection(db, "products");
        const q = query(productsRef, orderBy("createdAt", "desc"));
        
        onSnapshot(q, (snapshot) => {
            const productsData = [];
            productsContainer.innerHTML = '';
            
            snapshot.forEach((doc) => {
                productsData.push({ id: doc.id, ...doc.data() });
                const productElement = displayProductOnWebsite(doc.data(), doc.id);
                productsContainer.appendChild(productElement);
            });
            
            createCategoryFilter(productsData);
        });
    } catch (error) {
        console.error("Error setting up products listener:", error);
    }
}

// === GLOBAL FUNCTION FOR ADD TO CART ===
window.addToCart = async function(productId, productName, price, imageUrl) {
    try {
        let cart = JSON.parse(localStorage.getItem('cart')) || [];
        
        const existingItemIndex = cart.findIndex(item => item.id === productId);
        
        if (existingItemIndex >= 0) {
            cart[existingItemIndex].quantity += 1;
        } else {
            cart.push({
                id: productId,
                name: productName,
                price: price,
                image: imageUrl,
                quantity: 1
            });
        }
        
        localStorage.setItem('cart', JSON.stringify(cart));
        
        // Update cart count
        updateCartCount();
        
        showNotification(`${productName} added to cart!`, false);
        
    } catch (error) {
        console.error('Error adding to cart:', error);
        showNotification('Error adding item to cart. Please try again.', true);
    }
};

// === UPDATE CART COUNT ===
function updateCartCount() {
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    const totalItems = cart.reduce((total, item) => total + item.quantity, 0);
    
    const cartCountElements = document.querySelectorAll('.cart-count');
    cartCountElements.forEach(element => {
        element.textContent = totalItems;
        element.style.display = totalItems > 0 ? 'inline-block' : 'none';
    });
}

// === INITIALIZE APP ===
document.addEventListener('DOMContentLoaded', () => {
    console.log("Initializing SARM ENTERPRISES website...");
    
    // Load logo
    loadLogo();
    
    // Load products if on main page
    if (productsContainer) {
        console.log("Loading products for main page...");
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
    
    console.log("Website initialization complete!");
});

// Export for admin.js
export { auth, db, showNotification, getImagePath };

// === TEMPORARY DEBUG CODE ===
document.addEventListener('DOMContentLoaded', function() {
    console.log("=== DEBUG MODE ===");
    console.log("Website loaded successfully!");
    
    setTimeout(() => {
        console.log("Checking for product images...");
        const allImages = document.querySelectorAll('.product-card img');
        console.log(`Found ${allImages.length} image elements in product cards`);
        
        allImages.forEach((img, index) => {
            console.log(`Image ${index}: src = "${img.src}", loaded = ${img.complete}, width = ${img.naturalWidth}`);
            
            // Set error handler for each image
            img.onerror = function() {
                console.warn(`Image failed to load: ${this.src}`);
                // Fix duplicate paths
                if (this.src.includes('assets/products/assets/products/')) {
                    const fixedSrc = this.src.replace('assets/products/assets/products/', 'assets/products/');
                    console.log(`Fixing duplicate path: ${this.src} -> ${fixedSrc}`);
                    this.src = fixedSrc;
                }
            };
        });
    }, 2000);
});
