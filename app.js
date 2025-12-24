import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import { getFirestore, collection, getDocs, addDoc, updateDoc, deleteDoc, doc, onSnapshot, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";
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
// Load Products with error handling
async function loadProducts() {
    try {
        const querySnapshot = await getDocs(collection(db, "products"));
        if (!productsContainer) return;
        
        productsContainer.innerHTML = '';
        
        const productsArray = [];
        querySnapshot.forEach((doc) => {
            productsArray.push({ id: doc.id, ...doc.data() });
        });
        
        // Sort by pages
        productsArray.sort((a, b) => a.pages - b.pages);
        
        productsArray.forEach((product) => {
            createProductCard(product);
        });
        
        if (productsArray.length === 0) {
            productsContainer.innerHTML = '<p class="error-message">No products found. Please add products from admin panel.</p>';
        }
    } catch (error) {
        console.error("Error loading products:", error);
        if (productsContainer) {
            productsContainer.innerHTML = '<p class="error-message">Error loading products. Please try again later.</p>';
        }
    }
}

// Create Product Card
function createProductCard(product) {
    if (!productsContainer) return;
    
    const productCard = document.createElement('div');
    productCard.className = 'product-card';
    
    let stockClass = 'stock-in';
    let stockText = 'In Stock';
    
    if (product.stock <= 0) {
        stockClass = 'stock-out';
        stockText = 'Out of Stock';
    } else if (product.stock <= 10) {
        stockClass = 'stock-low';
        stockText = 'Low Stock';
    }
    
   // Use the local image path from Firestore, or a default
const imagePath = product.imagePath || 'assets/products/default-notebook.jpg';
    
    productCard.innerHTML = `
        <img src="${imagePath}" alt="${product.name}" class="product-image" onerror="this.src='assets/products/default-notebook.jpg'">
        <div class="product-info">
            <h3 class="product-title">${product.name}</h3>
            <div class="product-price">₹${product.price}</div>
            <span class="product-stock ${stockClass}">
                <i class="fas fa-box"></i> ${stockText} (${product.stock} units)
            </span>
            <ul class="product-features">
                <li><i class="fas fa-file-alt"></i> ${product.pages} Pages</li>
                <li><i class="fas fa-ruler-combined"></i> A4 Size</li>
                <li><i class="fas fa-spinner"></i> Spiral Binding</li>
                <li><i class="fas fa-truck"></i> Free Delivery within 5km</li>
            </ul>
            <a href="https://wa.me/917006927825?text=Hello%20SARM%20ENTERPRISES,%20I%20would%20like%20to%20order%20${encodeURIComponent(product.name)}%20(Price:%20₹${product.price})" 
               class="btn-whatsapp" target="_blank" style="width: 100%; text-align: center; margin-top: 10px;">
                <i class="fab fa-whatsapp"></i> Order on WhatsApp
            </a>
        </div>
    `;
    
    productsContainer.appendChild(productCard);
}

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

// Real-time listener for products
function setupProductsListener() {
    if (!productsContainer) return;
    
    try {
        onSnapshot(collection(db, "products"), (snapshot) => {
            productsContainer.innerHTML = '';
            const productsArray = [];
            
            snapshot.forEach((doc) => {
                productsArray.push({ id: doc.id, ...doc.data() });
            });
            
            // Sort by pages
            productsArray.sort((a, b) => a.pages - b.pages);
            
            productsArray.forEach((product) => {
                createProductCard(product);
            });
        });
    } catch (error) {
        console.error("Error setting up products listener:", error);
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
    
    // Load products if on main page
    if (productsContainer) {
        loadProducts();
        setupProductsListener();
    }
    
    // Load quotes
    loadQuotes();
    
    // Mobile menu toggle
    const menuToggle = document.querySelector('.menu-toggle');
    const navMenu = document.querySelector('.nav-menu');
    
    if (menuToggle && navMenu) {
        menuToggle.addEventListener('click', () => {
            navMenu.classList.toggle('active');
        });
    }
});

// Export for admin.js
export { auth, db, storage, showNotification };
