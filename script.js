// Vantaline Automotive static site script

// Set the current year in the footer
document.addEventListener('DOMContentLoaded', () => {
  const yearEl = document.getElementById('year');
  if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
  }
  // Load car inventory from Auto Trader feed (or fallback)
  loadCars();
});

/**
 * Function to fetch cars from Auto Trader feed.
 * Replace the FEED_URL with your actual Auto Trader API or XML feed URL.
 * This function assumes a JSON response with an array of vehicles.
 */
async function loadCars() {
  const container = document.getElementById('car-container');
  // Replace with your Auto Trader feed URL or API endpoint
  const FEED_URL = 'https://example.com/autotrader-feed.json';

  try {
    const response = await fetch(FEED_URL);
    if (!response.ok) {
      throw new Error(`Network response was not ok: ${response.status}`);
    }
    const data = await response.json();
    if (Array.isArray(data)) {
      renderCars(data, container);
    } else if (Array.isArray(data.vehicles)) {
      renderCars(data.vehicles, container);
    } else {
      console.warn('Unexpected feed format. Rendering fallback cars.');
      renderCars(getSampleCars(), container);
    }
  } catch (error) {
    console.error('Error fetching Auto Trader feed:', error);
    // Render fallback sample cars when feed cannot be fetched
    renderCars(getSampleCars(), container);
  }
}

/**
 * Render cars into the container.
 * @param {Array<Object>} cars
 * @param {HTMLElement} container
 */
function renderCars(cars, container) {
  container.innerHTML = '';
  cars.forEach((car) => {
    const card = document.createElement('div');
    card.className = 'car-card';
    const img = document.createElement('img');
    img.src = car.image || 'https://images.pexels.com/photos/358070/pexels-photo-358070.jpeg';
    img.alt = car.model || 'Vehicle image';
    img.className = 'car-image';
    const content = document.createElement('div');
    content.className = 'car-content';
    const title = document.createElement('h3');
    title.textContent = `${car.year || ''} ${car.make || ''} ${car.model || ''}`.trim();
    const mileage = document.createElement('p');
    mileage.textContent = car.mileage ? `${numberWithCommas(car.mileage)} miles` : '';
    const price = document.createElement('p');
    price.className = 'price';
    price.textContent = car.price ? `£${numberWithCommas(car.price)}` : '';
    // Append children
    content.appendChild(title);
    if (mileage.textContent) content.appendChild(mileage);
    content.appendChild(price);
    card.appendChild(img);
    card.appendChild(content);
    container.appendChild(card);
  });
}

/**
 * Provide sample cars for fallback display. Modify or replace these as needed.
 */
function getSampleCars() {
  return [
    {
      make: 'BMW',
      model: 'M3 Competition',
      year: 2022,
      mileage: 15000,
      price: 67995,
      image: 'https://images.pexels.com/photos/358070/pexels-photo-358070.jpeg',
    },
    {
      make: 'Audi',
      model: 'RS5 Sportback',
      year: 2021,
      mileage: 12000,
      price: 58995,
      image: 'https://images.pexels.com/photos/1149831/pexels-photo-1149831.jpeg',
    },
    {
      make: 'Mercedes-Benz',
      model: 'AMG C63 S',
      year: 2022,
      mileage: 9000,
      price: 73995,
      image: 'https://images.pexels.com/photos/573963/pexels-photo-573963.jpeg',
    },
  ];
}

/**
 * Format numbers with commas for readability.
 */
function numberWithCommas(x) {
  return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}