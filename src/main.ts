// Main landing page JavaScript

// ==================== SMOOTH SCROLLING ====================

function setupSmoothScrolling(): void {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', (e) => {
      e.preventDefault();
      const target = e.currentTarget as HTMLAnchorElement;
      const href = target.getAttribute('href');
      if (!href) return;

      const targetElement = document.querySelector(href);
      if (targetElement) {
        targetElement.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }
    });
  });
}

// ==================== ACTIVE NAV ON SCROLL ====================

function setupActiveNav(): void {
  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('.nav-link');

  window.addEventListener('scroll', () => {
    let current = '';
    sections.forEach(section => {
      const sectionTop = (section as HTMLElement).offsetTop;
      if (pageYOffset >= sectionTop - 200) {
        current = section.getAttribute('id') || '';
      }
    });

    navLinks.forEach(link => {
      link.classList.remove('active');
      if (link.getAttribute('href') === `#${current}`) {
        link.classList.add('active');
      }
    });
  });
}

// ==================== TOURNAMENT FILTERS ====================

function setupTournamentFilters(): void {
  const filterButtons = document.querySelectorAll('.filter-btn');
  const tournamentCards = document.querySelectorAll('.tournament-card');

  filterButtons.forEach(button => {
    button.addEventListener('click', () => {
      // Remove active class from all buttons
      filterButtons.forEach(btn => btn.classList.remove('active'));
      // Add active class to clicked button
      button.classList.add('active');

      const filterText = button.textContent?.trim() || '';

      // Filter tournament cards
      tournamentCards.forEach(card => {
        const cardElement = card as HTMLElement;

        if (filterText === 'Все') {
          cardElement.style.display = 'block';
          setTimeout(() => {
            cardElement.style.opacity = '1';
            cardElement.style.transform = 'translateY(0)';
          }, 10);
        } else {
          const gameTag = card.querySelector('.tournament-game')?.textContent || '';
          // Check for exact match or if game tag includes filter text
          const matches = gameTag === filterText ||
                         gameTag.includes(filterText) ||
                         (filterText === 'Warcraft III' && gameTag.includes('Warcraft')) ||
                         (filterText === 'Star Wars: EaW' && gameTag.includes('Star Wars')) ||
                         (filterText === 'Company of Heroes' && gameTag.includes('Company'));

          if (matches) {
            cardElement.style.display = 'block';
            setTimeout(() => {
              cardElement.style.opacity = '1';
              cardElement.style.transform = 'translateY(0)';
            }, 10);
          } else {
            cardElement.style.opacity = '0';
            cardElement.style.transform = 'translateY(20px)';
            setTimeout(() => {
              cardElement.style.display = 'none';
            }, 300);
          }
        }
      });
    });
  });
}

// ==================== SCROLL ANIMATIONS ====================

function setupScrollAnimations(): void {
  const observerOptions: IntersectionObserverInit = {
    threshold: 0.1,
    rootMargin: '0px 0px -100px 0px'
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const target = entry.target as HTMLElement;
        target.style.opacity = '1';
        target.style.transform = 'translateY(0)';
      }
    });
  }, observerOptions);

  // Observe tournament cards and match items
  const animatedElements = document.querySelectorAll('.tournament-card, .match-item, .stat-card');

  animatedElements.forEach(el => {
    const element = el as HTMLElement;
    element.style.opacity = '0';
    element.style.transform = 'translateY(30px)';
    element.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    observer.observe(element);
  });
}

// ==================== TOURNAMENT ACTIONS ====================

function setupTournamentActions(): void {
  // Join tournament buttons
  document.querySelectorAll('.tournament-card .btn-primary').forEach(button => {
    button.addEventListener('click', (e) => {
      e.stopPropagation();
      const tournamentCard = (button as HTMLElement).closest('.tournament-card');
      const tournamentTitle = tournamentCard?.querySelector('.tournament-title')?.textContent || 'Unknown';

      // Mock alert - replace with actual functionality
      alert(`Вы присоединились к турниру: ${tournamentTitle}\n\nЭто демо-функционал. В реальной версии здесь будет форма регистрации.`);
    });
  });

  // Tournament card click
  document.querySelectorAll('.tournament-card').forEach(card => {
    card.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      // Don't trigger if button was clicked
      if (target.classList.contains('btn-primary') || target.classList.contains('btn-secondary')) {
        return;
      }

      const tournamentTitle = card.querySelector('.tournament-title')?.textContent || 'Unknown';
      console.log(`Открыть детали турнира: ${tournamentTitle}`);
      // In real implementation, this would navigate to tournament details page
    });
  });
}

// ==================== LIVE STATUS INDICATOR ====================

function setupLiveIndicator(): void {
  setInterval(() => {
    const liveStatuses = document.querySelectorAll('.tournament-status.live');
    liveStatuses.forEach(status => {
      const element = status as HTMLElement;
      element.style.opacity = element.style.opacity === '0.7' ? '1' : '0.7';
    });
  }, 1000);
}

// ==================== INITIALIZATION ====================

function init(): void {
  setupSmoothScrolling();
  setupActiveNav();
  setupTournamentFilters();
  setupScrollAnimations();
  setupTournamentActions();
  setupLiveIndicator();

  console.log('🎮 MESA Platform loaded successfully!');
}

// Run on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
