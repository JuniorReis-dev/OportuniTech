// frontend/src/App.js
import React, { useState, useEffect, useRef } from "react";
import "./App.css";
import { gsap } from "gsap";
import Navbar from "./components/Navbar/Navbar"; // Certifique-se que este caminho está correto

function App() {
  const [estagios, setEstagios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [filtroDataInclusao, setFiltroDataInclusao] = useState("");
  const [filtroArea, setFiltroArea] = useState("");
  const [filtroEmpresa, setFiltroEmpresa] = useState("");
  const [filtroCidade, setFiltroCidade] = useState("");
  const [filtroTituloVaga, setFiltroTituloVaga] = useState("");
  const [filtroTipoVaga, setFiltroTipoVaga] = useState("");
  const [filtroPlataforma, setFiltroPlataforma] = useState("");

  const [isDarkMode, setIsDarkMode] = useState(() => {
    const localDarkMode = localStorage.getItem("darkMode");
    return localDarkMode ? JSON.parse(localDarkMode) : false;
  });

  const appRef = useRef(null);
  const filtersRef = useRef(null);
  const listRef = useRef(null);

  const toggleDarkMode = () => {
    setIsDarkMode((prevMode) => {
      const newMode = !prevMode;
      localStorage.setItem("darkMode", JSON.stringify(newMode));
      return newMode;
    });
  };

  useEffect(() => {
    if (isDarkMode) {
      document.body.classList.add("dark-mode");
    } else {
      document.body.classList.remove("dark-mode");
    }
  }, [isDarkMode]);

  const fetchEstagios = async () => {
    setLoading(true);
    setError(null);

    // Use a variável de ambiente para a URL base da API.
    // Se estiver usando Create React App, o prefixo seria REACT_APP_
    // Se estiver usando Vite, o prefixo seria VITE_
    // Este código usa NEXT_PUBLIC_ como estava no seu exemplo anterior.
    const apiBaseUrl =
      process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001";
    const apiUrl = `${apiBaseUrl}/api/estagios`;

    try {
      const response = await fetch(apiUrl);
      if (!response.ok) {
        throw new Error(
          `HTTP error! status: ${response.status} - ${response.statusText}`
        );
      }
      const data = await response.json();
      const sortedData = data.sort((a, b) => {
        const dateAValue = a.Data_de_Incluso;
        const dateBValue = b.Data_de_Incluso;
        let dateA, dateB;
        if (
          dateAValue &&
          typeof dateAValue === "string" &&
          dateAValue.match(/^\d{2}\/\d{2}\/\d{4}$/)
        ) {
          const partsA = dateAValue.split("/");
          dateA = new Date(`${partsA[2]}-${partsA[1]}-${partsA[0]}`);
        } else {
          dateA = new Date(0); // Data inválida ou ausente vai para o final/início
        }
        if (
          dateBValue &&
          typeof dateBValue === "string" &&
          dateBValue.match(/^\d{2}\/\d{2}\/\d{4}$/)
        ) {
          const partsB = dateBValue.split("/");
          dateB = new Date(`${partsB[2]}-${partsB[1]}-${partsB[0]}`);
        } else {
          dateB = new Date(0); // Data inválida ou ausente vai para o final/início
        }
        return dateB.getTime() - dateA.getTime(); // Ordena do mais recente para o mais antigo
      });
      setEstagios(sortedData);
    } catch (e) {
      setError(
        `Não foi possível carregar os dados das vagas. Verifique se o back-end (${apiUrl}) está rodando e a sua conexão. Detalhes: ${e.message}`
      );
      console.error("Erro ao buscar estágios:", e);
    } finally {
      setLoading(false);
    }
  };

  const estagiosFiltrados = estagios.filter((estagio) => {
    const dataInclusao = String(estagio.Data_de_Incluso || "").toLowerCase();
    const area = String(estagio.Area || "").toLowerCase();
    const empresa = String(estagio.Empresa || "").toLowerCase();
    const cidade = String(estagio.Cidade || "").toLowerCase();
    const tituloVaga = String(estagio.Titulo_da_Vaga || "").toLowerCase();
    const tipoVaga = String(estagio.Tipo_de_Vaga || "").toLowerCase();
    const plataforma = String(estagio.Plataforma || "").toLowerCase();

    return (
      (filtroDataInclusao
        ? dataInclusao.includes(filtroDataInclusao.toLowerCase())
        : true) &&
      (filtroArea ? area.includes(filtroArea.toLowerCase()) : true) &&
      (filtroEmpresa ? empresa.includes(filtroEmpresa.toLowerCase()) : true) &&
      (filtroCidade ? cidade.includes(filtroCidade.toLowerCase()) : true) &&
      (filtroTituloVaga
        ? tituloVaga.includes(filtroTituloVaga.toLowerCase())
        : true) &&
      (filtroTipoVaga
        ? tipoVaga.includes(filtroTipoVaga.toLowerCase())
        : true) &&
      (filtroPlataforma
        ? plataforma.includes(filtroPlataforma.toLowerCase())
        : true)
    );
  });

  useEffect(() => {
    if (!loading && !error) {
      if (appRef.current) {
        gsap.fromTo(
          appRef.current,
          { opacity: 0, y: 20 },
          { opacity: 1, y: 0, duration: 0.8, ease: "power3.out" }
        );
      }

      const elementsToAnimate = [filtersRef.current].filter(Boolean);
      if (elementsToAnimate.length > 0) {
        gsap.fromTo(
          elementsToAnimate,
          { opacity: 0, y: 20 },
          {
            opacity: 1,
            y: 0,
            duration: 0.6,
            ease: "power2.out",
            stagger: 0.2,
            delay: 0.3,
          }
        );
      }

      if (
        listRef.current &&
        listRef.current.children &&
        listRef.current.children.length > 0 &&
        estagiosFiltrados.length > 0
      ) {
        gsap.fromTo(
          listRef.current.children,
          { opacity: 0, y: 20 },
          {
            opacity: 1,
            y: 0,
            duration: 0.3,
            ease: "power2.out",
            stagger: 0.03,
            delay: 0,
          }
        );
      }
    }
  }, [loading, error, estagiosFiltrados.length]); // Adicionado estagiosFiltrados.length

  useEffect(() => {
    fetchEstagios();
    const intervalTime = 5 * 60 * 1000; // 5 minutos
    const intervalId = setInterval(fetchEstagios, intervalTime);
    return () => clearInterval(intervalId);
  }, []); // Roda uma vez ao montar e configura o intervalo

  if (loading)
    return (
      <>
        <Navbar toggleDarkMode={toggleDarkMode} isDarkMode={isDarkMode} />
        <div className="mensagem-carregando">Carregando vagas...</div>
      </>
    );

  const renderConteudoPrincipal = () => {
    if (error) return <div className="mensagem-erro">{error}</div>;
    if (estagios.length === 0 && !loading) {
      return (
        <div className="mensagem-nenhuma-vaga">
          Nenhuma vaga encontrada no sistema. Verifique a fonte de dados.
        </div>
      );
    }
    if (estagiosFiltrados.length === 0 && estagios.length > 0 && !loading) {
      return (
        <div className="mensagem-nenhuma-vaga">
          Nenhuma vaga corresponde aos filtros aplicados. Tente outros termos.
        </div>
      );
    }
    return (
      <div className="lista-estagios" ref={listRef}>
        {estagiosFiltrados.map((estagio, index) => (
          <div key={index} className="estagio-card">
            <h2>{estagio.Titulo_da_Vaga || estagio.Titulo_da_Vaga_Text}</h2>
            <p>
              <strong>Empresa:</strong> {estagio.Empresa}
            </p>
            <p>
              <strong>Localização:</strong> {estagio.Cidade}
            </p>
            <p>
              <strong>Área:</strong> {estagio.Area}
            </p>
            <p>
              <strong>Tipo de Vaga:</strong> {estagio.Tipo_de_Vaga}
            </p>
            <p>
              <strong>Plataforma:</strong> {estagio.Plataforma}
            </p>
            <p>
              <strong>Data de Inclusão:</strong> {estagio.Data_de_Incluso}
            </p>
            {estagio.Link && (
              <p>
                <strong>Link:</strong>{" "}
                <a
                  href={estagio.Link}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Ver Vaga
                </a>
              </p>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <>
      <Navbar toggleDarkMode={toggleDarkMode} isDarkMode={isDarkMode} />
      <div className="App" ref={appRef}>
        <div className="filtros" ref={filtersRef}>
          <input
            type="text"
            placeholder="Data de Inclusão (DD/MM/AAAA)"
            value={filtroDataInclusao}
            onChange={(e) => setFiltroDataInclusao(e.target.value)}
          />
          <input
            type="text"
            placeholder="Área (Ex: Front-end, Dados)"
            value={filtroArea}
            onChange={(e) => setFiltroArea(e.target.value)}
          />
          <input
            type="text"
            placeholder="Empresa"
            value={filtroEmpresa}
            onChange={(e) => setFiltroEmpresa(e.target.value)}
          />
          <input
            type="text"
            placeholder="Cidade (Ex: São Paulo, Remoto)"
            value={filtroCidade}
            onChange={(e) => setFiltroCidade(e.target.value)}
          />
          <input
            type="text"
            placeholder="Título da Vaga"
            value={filtroTituloVaga}
            onChange={(e) => setFiltroTituloVaga(e.target.value)}
          />
          <input
            type="text"
            placeholder="Tipo de Vaga (Ex: Estágio, Trainee)"
            value={filtroTipoVaga}
            onChange={(e) => setFiltroTipoVaga(e.target.value)}
          />
          <input
            type="text"
            placeholder="Plataforma"
            value={filtroPlataforma}
            onChange={(e) => setFiltroPlataforma(e.target.value)}
          />
          <button
            onClick={fetchEstagios}
            className="primary-action-button"
            style={{
              gridColumn: "1 / -1",
              justifySelf: "center",
              marginTop: "10px",
            }}
            disabled={loading} // Desabilita o botão enquanto carrega
          >
            {loading ? "Atualizando..." : "Atualizar Vagas Agora"}
          </button>
        </div>
        {renderConteudoPrincipal()}
      </div>
    </>
  );
}

export default App;
