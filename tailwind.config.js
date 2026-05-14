module.exports = {
  content: [
    './index.html',
    './js/**/*.js'
  ],
  theme: {
    extend: {
      animation: {
        'fade-in-up': 'fadeInUp 0.5s cubic-bezier(0.2, 0.8, 0.2, 1) forwards',
        'pop-in': 'popIn 0.4s cubic-bezier(0.3, 0.9, 0.3, 1.1) forwards'
      },
      keyframes: {
        fadeInUp: {
          '0%': {
            opacity: '0',
            transform: 'translateY(15px)'
          },
          '100%': {
            opacity: '1',
            transform: 'translateY(0)'
          }
        },
        popIn: {
          '0%': {
            opacity: '0',
            transform: 'scale(0.96)'
          },
          '100%': {
            opacity: '1',
            transform: 'scale(1)'
          }
        }
      },
      boxShadow: {
        convex: '0 10px 15px -3px rgba(0, 0, 0, 0.08), 0 4px 6px -2px rgba(0, 0, 0, 0.04), 0 30px 40px -10px rgba(15, 23, 42, 0.06)',
        floating: '0 25px 50px -12px rgba(15, 23, 42, 0.25), inset 0 1px 1px rgba(255, 255, 255, 0.8)'
      }
    }
  },
  plugins: []
};