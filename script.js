// Vantaline Automotive site script

document.addEventListener('DOMContentLoaded', () => {
  const yearEl = document.getElementById('year');
  if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
  }
  loadCars();
});

/**
 * Load cars from Auto Trader feed or fallback list.
 */
async function loadCars() {
  const container = document.getElementById('car-container');
  const FEED_URL = 'https://example.com/autotrader-feed.json'; // replace with your Auto Trader feed

  try {
    const response = await fetch(FEED_URL);
    if (!response.ok) throw new Error(`Network response was not ok: ${response.status}`);
    const data = await response.json();
    if (Array.isArray(data)) {
      renderCars(data, container);
    } else if (Array.isArray(data.vehicles)) {
      renderCars(data.vehicles, container);
    } else {
      renderCars(getSampleCars(), container);
    }
  } catch (error) {
    console.error('Error fetching Auto Trader feed:', error);
    renderCars(getSampleCars(), container);
  }
}

/**
 * Render car cards into the DOM.
 * @param {Array<object>} cars
 * @param {HTMLElement} container
 */
function renderCars(cars, container) {
  container.innerHTML = '';
  cars.forEach((car) => {
    const card = document.createElement('div');
    card.className = 'car-card';

    const img = document.createElement('img');
    img.src = car.image || '';
    img.alt = `${car.make} ${car.model}`;

    const content = document.createElement('div');
    content.className = 'car-content';

    const title = document.createElement('h3');
    title.textContent = `${car.make} ${car.model}`;

    const details = document.createElement('p');
    details.textContent = `${car.year} · ${car.mileage.toLocaleString()} miles`;

    const price = document.createElement('p');
    price.className = 'price';
    price.textContent = car.price ? `£${car.price.toLocaleString()}` : '';

    content.appendChild(title);
    content.appendChild(details);
    content.appendChild(price);

    card.appendChild(img);
    card.appendChild(content);

    container.appendChild(card);
  });
}

/**
 * Fallback list of cars extracted from the Auto Trader dealer page.
 * Each object represents a vehicle currently advertised by Vantaline Automotive.
 */
function getSampleCars() {
  return [
    {
      make: 'Nissan',
      model: 'Navara 2.3 dci Tekna Auto 4WD Euro 6 4dr',
      year: 2017,
      mileage: 91507,
      price: 8500,
      image: 'https://images.pexels.com/photos/358070/pexels-photo-358070.jpeg'
    },
    {
      make: 'Mercedes-Benz',
      model: 'C Class C180 BlueEfficiency AMG Sport Plus G-Tronic+ Euro 5 (s/s) 4dr',
      year: 2013,
      mileage: 81258,
      price: 5680,
      image: 'https://images.pexels.com/photos/1149831/pexels-photo-1149831.jpeg'
    },
    {
      make: 'Toyota',
      model: 'Yaris 1.5 VVT-h Icon E-CVT Euro 6 (s/s) 5dr',
      year: 2018,
      mileage: 60134,
      price: 7898,
      image: 'https://images.pexels.com/photos/573963/pexels-photo-573963.jpeg'
    },
    {
      make: 'Lexus',
      model: 'IS 2.5 250 SE 4dr',
      year: 2008,
      mileage: 115000,
      price: 2995,
      image: 'https://images.pexels.com/photos/358070/pexels-photo-358070.jpeg'
    },
    {
      make: 'Land Rover',
      model: 'Range Rover Sport SD V6 Autobiography Sport Auto 4WD Euro 5 5dr',
      year: 2013,
      mileage: 60000,
      price: 8500,
      image: 'https://images.pexels.com/photos/358070/pexels-photo-358070.jpeg'
    },
    {
      make: 'Mercedes-Benz',
      model: 'C Class 1.6 C180 BlueEfficiency Executive SE G-Tronic+ Euro 5 (s/s) 4dr',
      year: 2012,
      mileage: 80000,
      price: 4995,
      image: 'https://images.pexels.com/photos/1149831/pexels-photo-1149831.jpeg'
    },
    {
      make: 'Ford',
      model: 'Kuga 2.0 TDCi Titanium X Powershift AWD Euro 5 5dr',
      year: 2013,
      mileage: 60000,
      price: 5500,
      image: 'https://images.pexels.com/photos/573963/pexels-photo-573963.jpeg'
    },
    {
      make: 'Ford',
      model: 'Focus 1.6 Style 5dr',
      year: 2008,
      mileage: 80000,
      price: 1850,
      image: 'https://images.pexels.com/photos/573963/pexels-photo-573963.jpeg'
    }
  ];
}
