(function () {
  let currentUser = null;

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  // --- Nav scroll ---
  window.addEventListener('scroll', () => {
    $('#nav').classList.toggle('scrolled', window.scrollY > 60);
  });

  // --- Mobile nav toggle ---
  $('#navToggle').addEventListener('click', () => {
    $('#navLinks').classList.toggle('open');
  });

  // --- Smooth scroll for nav links ---
  $$('.nav__links a, .hero .btn, .footer__links a').forEach(link => {
    link.addEventListener('click', (e) => {
      const href = link.getAttribute('href');
      if (href && href.startsWith('#')) {
        e.preventDefault();
        const target = $(href);
        if (target) target.scrollIntoView({ behavior: 'smooth' });
        $('#navLinks').classList.remove('open');
      }
    });
  });

  // --- Modal logic ---
  function openModal(id) {
    closeAllModals();
    $(id).classList.add('active');
  }

  function closeAllModals() {
    $$('.modal').forEach(m => m.classList.remove('active'));
    $$('.form__error').forEach(e => (e.textContent = ''));
    $$('.form__success').forEach(e => (e.textContent = ''));
  }

  $$('.modal__overlay, .modal__close').forEach(el => {
    el.addEventListener('click', closeAllModals);
  });

  $('#showSignUp').addEventListener('click', (e) => { e.preventDefault(); openModal('#signUpModal'); });
  $('#showSignIn').addEventListener('click', (e) => { e.preventDefault(); openModal('#signInModal'); });

  // --- Auth button ---
  $('#authBtn').addEventListener('click', () => {
    if (currentUser) {
      fetch('/api/auth/logout', { method: 'POST' }).then(() => {
        currentUser = null;
        updateAuthUI();
      });
    } else {
      openModal('#signInModal');
    }
  });

  // --- Sign In ---
  $('#signInForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = $('#signInEmail').value;
    const password = $('#signInPassword').value;
    try {
      const res = await fetch('/api/auth/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (data.success) {
        currentUser = data.user;
        updateAuthUI();
        closeAllModals();
        $('#signInForm').reset();
      } else {
        $('#signInError').textContent = data.message;
      }
    } catch {
      $('#signInError').textContent = 'Connection error';
    }
  });

  // --- Sign Up ---
  $('#signUpForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = $('#signUpName').value;
    const email = $('#signUpEmail').value;
    const password = $('#signUpPassword').value;
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password })
      });
      const data = await res.json();
      if (data.success) {
        currentUser = data.user;
        updateAuthUI();
        closeAllModals();
        $('#signUpForm').reset();
      } else {
        $('#signUpError').textContent = data.message;
      }
    } catch {
      $('#signUpError').textContent = 'Connection error';
    }
  });

  // --- Auth UI update ---
  function updateAuthUI() {
    const btn = $('#authBtn');
    if (currentUser) {
      btn.textContent = 'Sign Out';
      btn.classList.add('btn--logged');
    } else {
      btn.textContent = 'Sign In';
      btn.classList.remove('btn--logged');
    }
  }

  // --- Check auth status on load ---
  async function checkAuth() {
    try {
      const res = await fetch('/api/auth/status');
      const data = await res.json();
      if (data.loggedIn) {
        currentUser = data.user;
        updateAuthUI();
      }
    } catch { /* silent */ }
  }

  // --- Render rooms ---
  async function renderRooms() {
    try {
      const res = await fetch('/api/booking/rooms');
      const data = await res.json();
      if (!data.success) return;
      const grid = $('#roomsGrid');
      grid.innerHTML = data.rooms.map(room => `
        <div class="room-card">
          <span class="room-card__number">0${room.id}</span>
          <h3 class="room-card__name">${room.name}</h3>
          <p class="room-card__desc">${room.description}</p>
          <p class="room-card__price"><span>&euro;${room.price}</span> / night</p>
          <button class="btn btn--outline btn--sm" data-book="${room.id}" data-name="${room.name}">Book Now</button>
        </div>
      `).join('');

      grid.addEventListener('click', (e) => {
        const bookBtn = e.target.closest('[data-book]');
        if (!bookBtn) return;
        if (!currentUser) {
          openModal('#signInModal');
          return;
        }
        $('#bookingRoomId').value = bookBtn.dataset.book;
        $('#bookingRoomName').textContent = bookBtn.dataset.name;
        openModal('#bookingModal');
      });
    } catch { /* silent */ }
  }

  // --- Booking form ---
  $('#bookingForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const roomId = $('#bookingRoomId').value;
    const checkIn = $('#bookingCheckIn').value;
    const checkOut = $('#bookingCheckOut').value;
    const guests = $('#bookingGuests').value;
    try {
      const res = await fetch('/api/booking/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId, checkIn, checkOut, guests })
      });
      const data = await res.json();
      if (data.success) {
        $('#bookingSuccess').textContent = 'Booking confirmed!';
        $('#bookingError').textContent = '';
        setTimeout(closeAllModals, 1500);
        $('#bookingForm').reset();
      } else {
        $('#bookingError').textContent = data.message;
      }
    } catch {
      $('#bookingError').textContent = 'Connection error';
    }
  });

  // --- Gallery filter ---
  $$('.gallery__filter').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('.gallery__filter').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const filter = btn.dataset.filter;
      $$('.gallery__item').forEach(item => {
        if (filter === 'all' || item.dataset.category === filter) {
          item.classList.remove('hidden');
        } else {
          item.classList.add('hidden');
        }
      });
    });
  });

  // --- Contact form ---
  $('#contactForm').addEventListener('submit', (e) => {
    e.preventDefault();
    alert('Message sent. We will get back to you soon.');
    $('#contactForm').reset();
  });

  // --- Init ---
  checkAuth();
  renderRooms();
})();
