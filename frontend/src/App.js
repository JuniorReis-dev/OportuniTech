// frontend/src/App.js
import React, { useState, useEffect, useRef } from "react";
import "./App.css";
import { gsap } from "gsap"; // Importa o GSAP

function App() {
  // Estados para armazenar os dados e o status da aplicação
  const [estagios, setEstagios] = useState([]); // Lista de estágios
  const [loading, setLoading] = useState(true); // Indica se os dados estão sendo carregados
  const [error, setError] = useState(null); // Armazena mensagens de erro

  // Estados para os filtros
  const [filtroDataInclusao, setFiltroDataInclusao] = useState("");
  const [filtroArea, setFiltroArea] = useState("");
  const [filtroEmpresa, setFiltroEmpresa] = useState("");
  const [filtroCidade, setFiltroCidade] = useState("");
  const [filtroTituloVaga, setFiltroTituloVaga] = useState("");
  const [filtroTipoVaga, setFiltroTipoVaga] = useState("");
  const [filtroPlataforma, setFiltroPlataforma] = useState("");

  // Referências para os elementos DOM para o GSAP
  const appRef = useRef(null);
  const titleRef = useRef(null);
  const buttonRef = useRef(null);
  const filtersRef = useRef(null);
  const listRef = useRef(null);

  // Função assíncrona para buscar os estágios do back-end
  const fetchEstagios = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("http://localhost:3001/api/estagios");
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
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
          dateA = new Date(0);
        }

        if (
          dateBValue &&
          typeof dateBValue === "string" &&
          dateBValue.match(/^\d{2}\/\d{2}\/\d{4}$/)
        ) {
          const partsB = dateBValue.split("/");
          dateB = new Date(`${partsB[2]}-${partsB[1]}-${partsB[0]}`);
        } else {
          dateB = new Date(0);
        }
        return dateB.getTime() - dateA.getTime();
      });
      setEstagios(sortedData);
    } catch (e) {
      setError(
        "Não foi possível carregar os dados das vagas. Verifique se o back-end está rodando e a sua conexão com a internet."
      );
      console.error("Erro ao buscar estágios:", e);
    } finally {
      setLoading(false);
    }
  };

  // Lógica de filtragem dos estágios (definida antes do useEffect que a utiliza)
  const estagiosFiltrados = estagios.filter((estagio) => {
    const dataInclusao = estagio.Data_de_Incluso || "";
    const area = estagio.Area || "";
    const empresa = estagio.Empresa || "";
    const cidade = estagio.Cidade || "";
    const tituloVaga = estagio.Titulo_da_Vaga || "";
    const tipoVaga = estagio.Tipo_de_Vaga || "";
    const plataforma = estagio.Plataforma || "";

    const dataInclusaoMatch = filtroDataInclusao
      ? dataInclusao.toLowerCase().includes(filtroDataInclusao.toLowerCase())
      : true;
    const areaMatch = filtroArea
      ? area.toLowerCase().includes(filtroArea.toLowerCase())
      : true;
    const empresaMatch = filtroEmpresa
      ? empresa.toLowerCase().includes(filtroEmpresa.toLowerCase())
      : true;
    const cidadeMatch = filtroCidade
      ? cidade.toLowerCase().includes(filtroCidade.toLowerCase())
      : true;
    const tituloVagaMatch = filtroTituloVaga
      ? tituloVaga.toLowerCase().includes(filtroTituloVaga.toLowerCase())
      : true;
    const tipoVagaMatch = filtroTipoVaga
      ? tipoVaga.toLowerCase().includes(filtroTipoVaga.toLowerCase())
      : true;
    const plataformaMatch = filtroPlataforma
      ? plataforma.toLowerCase().includes(filtroPlataforma.toLowerCase())
      : true;

    return (
      dataInclusaoMatch &&
      areaMatch &&
      empresaMatch &&
      cidadeMatch &&
      tituloVagaMatch &&
      tipoVagaMatch &&
      plataformaMatch
    );
  });

  // Efeito para animações GSAP -- CORRIGIDO
  useEffect(() => {
    // Só executa animações se não estiver carregando, não houver erro,
    // e os refs principais estiverem disponíveis.
    if (!loading && !error) {
      if (appRef.current) {
        gsap.fromTo(
          appRef.current,
          { opacity: 0, y: 20 },
          { opacity: 1, y: 0, duration: 0.8, ease: "power3.out" }
        );
      }

      // Combina refs para a animação sequencial e verifica se todos existem
      const elementsToAnimate = [
        titleRef.current,
        buttonRef.current,
        filtersRef.current,
      ].filter((el) => el);
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

      // Verifica listRef, seus filhos, e se há itens filtrados para animar
      if (
        listRef.current &&
        listRef.current.children &&
        listRef.current.children.length > 0 &&
        estagiosFiltrados.length > 0
      ) {
        gsap.fromTo(
          listRef.current.children,
          { opacity: 0, y: 50 },
          {
            opacity: 1,
            y: 0,
            duration: 0.6,
            ease: "power2.out",
            stagger: 0.1,
            delay: 0.5,
          }
        );
      }
    }
  }, [estagiosFiltrados, loading, error]); // Adicionado 'error' como dependência e verificações mais robustas

  // Efeito para o Polling (busca inicial e atualização automática)
  useEffect(() => {
    fetchEstagios(); // Busca inicial

    const intervalTime = 5 * 60 * 1000; // 5 minutos
    const intervalId = setInterval(fetchEstagios, intervalTime);

    return () => clearInterval(intervalId); // Limpeza ao desmontar
  }, []); // Array vazio para rodar apenas na montagem e desmontagem

  // Mensagens de status para o usuário
  if (loading)
    return (
      <div
        style={{
          textAlign: "center",
          padding: "40px",
          fontSize: "1.2em",
          color: "#555",
        }}
      >
        Carregando vagas...
      </div>
    );
  if (error)
    return (
      <div
        style={{
          textAlign: "center",
          color: "#d32f2f",
          padding: "40px",
          fontSize: "1.2em",
        }}
      >
        Erro ao carregar: {error}
      </div>
    );

  // Lógica para exibir mensagem quando não há vagas após o carregamento ou com filtros
  // Renderiza o layout principal mesmo que não haja vagas filtradas, para que os filtros fiquem visíveis
  const renderConteudoPrincipal = () => {
    if (estagios.length === 0 && !loading) {
      // Nenhuma vaga retornada do backend
      return (
        <div
          style={{
            textAlign: "center",
            padding: "40px",
            fontSize: "1.2em",
            color: "#555",
          }}
        >
          Nenhuma vaga encontrada no sistema. Verifique a planilha ou a fonte de
          dados.
        </div>
      );
    }
    if (estagiosFiltrados.length === 0 && estagios.length > 0 && !loading) {
      // Vagas existem, mas nenhuma corresponde aos filtros
      return (
        <div
          style={{
            textAlign: "center",
            padding: "40px",
            fontSize: "1.2em",
            color: "#555",
          }}
        >
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
    <div className="App" ref={appRef}>
      <h1 ref={titleRef}>Vagas Tech</h1>
      <button onClick={fetchEstagios} ref={buttonRef}>
        Atualizar Vagas Agora
      </button>
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
      </div>
      {renderConteudoPrincipal()}
    </div>
  );
}

export default App;
//arrumei a codigo
