// src/components/Navbar/Navbar.js
import React from "react";
import "./Navbar.css"; // <-- CONFIRA ESTE CAMINHO DE IMPORTAÇÃO!

function Navbar({ toggleDarkMode, isDarkMode }) {
  return (
    <nav className="app-navbar">
      <div className="navbar-content">
        <div className="logo-container">
          <svg
            width="36" // Largura do ícone
            height="36" // Altura do ícone
            viewBox="0 0 100 100" // Área de desenho interna do SVG
            className="logo-svg-icon" // Classe para estilização
            xmlns="http://www.w3.org/2000/svg"
            aria-label="OportuniTech Logo Icon"
          >
            <circle
              cx="40"
              cy="50"
              r="20"
              className="logo-svg-circle"
              strokeWidth="10"
              fill="none"
            />
            <line
              x1="60"
              y1="30"
              x2="60"
              y2="70"
              className="logo-svg-line"
              strokeWidth="10"
              strokeLinecap="round"
            />
            <line
              x1="45"
              y1="30"
              x2="75"
              y2="30"
              className="logo-svg-line"
              strokeWidth="10"
              strokeLinecap="round"
            />
          </svg>
          <span className="logo-text">OportuniTech</span>
        </div>
        <div className="nav-links">
          {/* <a href="#inicio" className="nav-link">Início</a> */}
        </div>
        <div className="dark-mode-toggle">
          <button
            onClick={toggleDarkMode}
            aria-label={isDarkMode ? "Ativar modo claro" : "Ativar modo escuro"}
          >
            {isDarkMode ? "☀️" : "🌙"}
          </button>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
