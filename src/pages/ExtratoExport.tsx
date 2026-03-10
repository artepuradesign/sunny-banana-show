import { useState, useEffect, useRef, useMemo, ReactNode } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Printer } from "lucide-react";
import { apiGet } from "@/lib/api";
import logoNu from "@/assets/logonu.png";

const A4_W = 210;
const A4_H = 297;
const PAD_SIDE = 15;
const PAD_TOP = 12;
const FOOTER_ZONE = 38;
const HEADER_ZONE = 28; // mm for repeated header
const CONTENT_H_FIRST = A4_H - PAD_TOP - FOOTER_ZONE - HEADER_ZONE; // header is on every page
const CONTENT_H_REST = A4_H - PAD_TOP - FOOTER_ZONE - HEADER_ZONE;

const ExtratoExport = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const contaId = searchParams.get("conta_id") || "";
  const dataInicio = searchParams.get("data_inicio") || "";
  const dataFim = searchParams.get("data_fim") || "";

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [pages, setPages] = useState<number[][] | null>(null);
  const measuringRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!contaId || !dataInicio || !dataFim) return;
    apiGet("extrato.php", { conta_id: contaId, data_inicio: dataInicio, data_fim: dataFim })
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [contaId, dataInicio, dataFim]);

  const fmt = (v: number) =>
    v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const fmtDoc = (doc: string) => {
    if (!doc) return "";
    const d = doc.replace(/\D/g, "");
    if (d.length === 11) return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
    if (d.length === 14) return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
    return doc;
  };

  const handlePrint = () => window.print();

  const conta = data?.conta || {};
  const resumo = data?.resumo || {};
  const movimentacoes = data?.movimentacoes || {};
  const datasOrdenadas = useMemo(() => Object.keys(movimentacoes).sort(), [movimentacoes]);

  const fmtPeriodo = (d: string) =>
    new Date(d + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" }).toUpperCase();

  const fmtDia = (d: string) => {
    const dt = new Date(d + "T12:00:00");
    const day = String(dt.getDate()).padStart(2, "0");
    const months = ["JAN","FEV","MAR","ABR","MAI","JUN","JUL","AGO","SET","OUT","NOV","DEZ"];
    return `${day} ${months[dt.getMonth()]} ${dt.getFullYear()}`;
  };

  const saldoPorDia: Record<string, number> = useMemo(() => {
    const result: Record<string, number> = {};
    let acc = resumo.saldo_inicial || 0;
    for (const dia of datasOrdenadas) {
      for (const t of movimentacoes[dia]) {
        if (t.tipo === "entrada") acc += parseFloat(t.valor);
        else acc -= parseFloat(t.valor);
      }
      result[dia] = acc;
    }
    return result;
  }, [resumo, datasOrdenadas, movimentacoes]);

  const footerDateText = `Extrato gerado dia ${new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })} às ${new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;

  const pageStyle: React.CSSProperties = {
    fontFamily: "'Graphik', 'Helvetica Neue', Helvetica, Arial, sans-serif",
    fontWeight: 400,
    fontSize: "12px",
    lineHeight: "1.6",
    color: "#222",
  };

  // Repeated page header (logo + account info + period)
  const PageHeader = () => (
    <div style={{ marginBottom: "12px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
        <img src={logoNu} alt="Nu" style={{ height: "28px", width: "auto", marginLeft: "25px" }} />
        <div style={{ textAlign: "right", fontSize: "12px", lineHeight: "1.6", color: "#767676" }}>
          <p style={{ fontWeight: 400 }}>{conta.titular}</p>
          <p>
            <span style={{ fontWeight: 700, color: "#222" }}>{conta.tipo_conta === "PJ" ? "CNPJ" : "CPF"}</span>{"  "}{fmtDoc(conta.documento)}{"  "}
            <span style={{ fontWeight: 700, color: "#222" }}>Agência</span>{"  "}{conta.agencia || "0001"}{"  "}
            <span style={{ fontWeight: 700, color: "#222" }}>Conta</span>
          </p>
          <p>{conta.numero_conta}</p>
        </div>
      </div>
      <div style={{ borderBottom: "2px solid #ccc", paddingBottom: "6px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <span style={{ fontWeight: 700, fontSize: "13px" }}>
            {fmtPeriodo(dataInicio)} a {fmtPeriodo(dataFim)}
          </span>
          <span style={{ fontSize: "13px", color: "#666" }}>VALORES EM R$</span>
        </div>
      </div>
    </div>
  );

  // Build content blocks (NO header - header is rendered separately on each page)
  const blocks: ReactNode[] = useMemo(() => {
    if (!data) return [];
    const b: ReactNode[] = [];

    // Block 0: Summary (only on first page, part of content flow)
    b.push(
      <div key="summary">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <div>
            <p style={{ fontSize: "12px", color: "#000", marginBottom: "4px", fontWeight: 700 }}>Saldo final do período</p>
            <p style={{ fontSize: "22px", fontWeight: 700, color: "#8A05BE", lineHeight: "1.2" }}>
              R$ {fmt(resumo.saldo_final)}
            </p>
          </div>
          <table style={{ fontSize: "13px", borderCollapse: "collapse", minWidth: "320px" }}>
            <tbody>
              <tr><td style={{ fontWeight: 700, padding: "3px 16px 3px 0" }}>Saldo inicial</td><td style={{ textAlign: "right", padding: "3px 0" }}>{fmt(resumo.saldo_inicial)}</td></tr>
              <tr><td style={{ padding: "3px 16px 3px 0", color: "#444" }}>Rendimento líquido</td><td style={{ textAlign: "right", padding: "3px 0" }}>+{fmt(resumo.rendimento_liquido)}</td></tr>
              <tr><td style={{ padding: "3px 16px 3px 0", color: "#444" }}>Total de entradas</td><td style={{ textAlign: "right", padding: "3px 0" }}>+{fmt(resumo.total_entradas)}</td></tr>
              <tr><td style={{ padding: "3px 16px 3px 0", color: "#444" }}>Total de saídas</td><td style={{ textAlign: "right", padding: "3px 0" }}>-{fmt(resumo.total_saidas)}</td></tr>
              <tr><td style={{ fontWeight: 700, padding: "6px 16px 3px 0" }}>Saldo final do período</td><td style={{ fontWeight: 700, textAlign: "right", padding: "6px 0 3px 0" }}>{fmt(resumo.saldo_final)}</td></tr>
            </tbody>
          </table>
        </div>
        <div style={{ borderBottom: "2px solid #ccc", marginBottom: "4px" }}></div>
        <div style={{ marginBottom: "12px" }}>
          <span style={{ fontWeight: 700, fontSize: "13px" }}>Movimentações</span>
        </div>
      </div>
    );

    // Each day as a block
    datasOrdenadas.forEach(dia => {
      const trans = movimentacoes[dia];
      const entradas = trans.filter((t: any) => t.tipo === "entrada");
      const saidas = trans.filter((t: any) => t.tipo === "saida");
      const totalE = entradas.reduce((s: number, t: any) => s + parseFloat(t.valor), 0);
      const totalS = saidas.reduce((s: number, t: any) => s + parseFloat(t.valor), 0);
      const dateShownInEntradas = entradas.length > 0;

      b.push(
        <div key={`dia-${dia}`}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
            <tbody>
              {entradas.length > 0 && (
                <>
                  <tr>
                    <td style={{ width: "110px", verticalAlign: "top", padding: "10px 16px 10px 0", color: "#222" }}>{fmtDia(dia)}</td>
                    <td style={{ fontWeight: 700, padding: "10px 0", verticalAlign: "top" }}>Total de entradas</td>
                    <td style={{ padding: "10px 0" }}></td>
                    <td style={{ fontWeight: 700, textAlign: "right", padding: "10px 0 10px 24px", whiteSpace: "nowrap", verticalAlign: "top" }}>+ {fmt(totalE)}</td>
                  </tr>
                  {entradas.map((t: any, i: number) => (
                    <tr key={t.id || i}>
                      <td style={{ padding: "6px 16px 6px 0" }}></td>
                      <td style={{ padding: "6px 0", verticalAlign: "top", width: "200px" }}>{t.descricao}</td>
                      <td style={{ padding: "6px 8px", verticalAlign: "top", color: "#555", fontSize: "11.5px", lineHeight: "2" }}>
                        {t.beneficiario_nome} - {t.beneficiario_documento} - {t.beneficiario_banco}{t.beneficiario_banco_codigo ? ` (${t.beneficiario_banco_codigo})` : ""} Agência: {t.beneficiario_agencia} Conta: {t.beneficiario_conta}
                      </td>
                      <td style={{ textAlign: "right", padding: "6px 0 6px 24px", verticalAlign: "top", whiteSpace: "nowrap" }}>{fmt(parseFloat(t.valor))}</td>
                    </tr>
                  ))}
                </>
              )}
              {saidas.length > 0 && (
                <>
                  <tr>
                    <td style={{ width: "110px", verticalAlign: "top", padding: "10px 16px 10px 0", color: "#222" }}>{!dateShownInEntradas ? fmtDia(dia) : ""}</td>
                    <td style={{ fontWeight: 700, padding: "10px 0", verticalAlign: "top" }}>Total de saídas</td>
                    <td style={{ padding: "10px 0" }}></td>
                    <td style={{ fontWeight: 700, textAlign: "right", padding: "10px 0 10px 24px", whiteSpace: "nowrap", verticalAlign: "top" }}>- {fmt(totalS)}</td>
                  </tr>
                  {saidas.map((t: any, i: number) => (
                    <tr key={t.id || i}>
                      <td style={{ padding: "6px 16px 6px 0" }}></td>
                      <td style={{ padding: "6px 0", verticalAlign: "top", width: "200px" }}>{t.descricao}</td>
                      <td style={{ padding: "6px 8px", verticalAlign: "top", color: "#555", fontSize: "11.5px", lineHeight: "2" }}>
                        {t.beneficiario_nome} - {t.beneficiario_documento} - {t.beneficiario_banco}{t.beneficiario_banco_codigo ? ` (${t.beneficiario_banco_codigo})` : ""} Agência: {t.beneficiario_agencia} Conta: {t.beneficiario_conta}
                      </td>
                      <td style={{ textAlign: "right", padding: "6px 0 6px 24px", verticalAlign: "top", whiteSpace: "nowrap" }}>{fmt(parseFloat(t.valor))}</td>
                    </tr>
                  ))}
                </>
              )}
              <tr style={{ borderBottom: "2px solid #ccc" }}>
                <td style={{ padding: "10px 16px 10px 0" }}></td>
                <td style={{ fontWeight: 700, padding: "10px 0" }}>Saldo do dia</td>
                <td style={{ padding: "10px 0" }}></td>
                <td style={{ fontWeight: 700, textAlign: "right", padding: "10px 0 10px 24px" }}>{fmt(saldoPorDia[dia])}</td>
              </tr>
            </tbody>
          </table>
        </div>
      );
    });

    // Disclaimer block
    b.push(
      <div key="disclaimer" style={{ marginTop: "30px" }}>
        <div style={{ borderTop: "1px solid #ddd", paddingTop: "12px", fontSize: "10px", color: "#555", lineHeight: "1.6" }}>
          <p>O saldo líquido corresponde ao total de depósitos e rendimentos em conta, não considerando movimentações feitas após a data mencionada.</p>
          <p>Não nos responsabilizamos pelo uso indevido ou por alterações das informações originalmente contidas neste documento após envio.</p>
          <p>Asseguramos a autenticidade destas movimentações e das informações aqui citadas.</p>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginTop: "16px", fontSize: "11.5px", lineHeight: "1.6", color: "#222", paddingBottom: "12px", borderBottom: "2px solid #ccc" }}>
          <div>
            <p style={{ fontWeight: 700 }}>Nu Financeira S.A. - Sociedade de Credito, Financiamento</p>
            <p style={{ fontWeight: 700 }}>e Investimento</p>
            <p>CNPJ: 30.680.829/0001-43</p>
          </div>
          <div style={{ textAlign: "right" }}>
            <p style={{ fontWeight: 700 }}>Nu Pagamentos S.A. - Instituição de Pagamento</p>
            <p>CNPJ: 18.236.120/0001-58</p>
          </div>
        </div>
      </div>
    );

    return b;
  }, [data, conta, resumo, datasOrdenadas, movimentacoes, saldoPorDia, dataInicio, dataFim]);

  // Measure blocks and paginate
  useEffect(() => {
    if (!measuringRef.current || blocks.length === 0) return;

    const timer = setTimeout(() => {
      const container = measuringRef.current;
      if (!container) return;

      const children = Array.from(container.children) as HTMLElement[];
      if (children.length === 0) return;

      const containerPxWidth = container.offsetWidth;
      const mmToPx = containerPxWidth / (A4_W - 2 * PAD_SIDE);

      // First page has more room (header is part of page template, but summary block is bigger)
      const maxFirst = CONTENT_H_FIRST * mmToPx;
      const maxRest = CONTENT_H_REST * mmToPx;

      const result: number[][] = [];
      let currentPage: number[] = [];
      let currentH = 0;
      let maxH = maxFirst;

      children.forEach((child, i) => {
        const h = child.offsetHeight;
        if (currentPage.length > 0 && currentH + h > maxH) {
          result.push(currentPage);
          currentPage = [i];
          currentH = h;
          maxH = maxRest;
        } else {
          currentPage.push(i);
          currentH += h;
        }
      });
      if (currentPage.length > 0) result.push(currentPage);

      setPages(result);
    }, 200);

    return () => clearTimeout(timer);
  }, [blocks]);

  // Footer component
  const PageFooter = ({ pageNum, totalPages }: { pageNum: number; totalPages: number }) => (
    <div style={{
      position: "absolute",
      bottom: `${PAD_SIDE}mm`,
      left: `${PAD_SIDE}mm`,
      right: `${PAD_SIDE}mm`,
      fontSize: "9px",
      color: "#767676",
      lineHeight: "1.5",
      borderTop: "1.5px solid #ccc",
      paddingTop: "8px",
      fontFamily: "'Graphik', 'Helvetica Neue', Helvetica, Arial, sans-serif",
    }}>
      <p>Tem alguma dúvida? Mande uma mensagem para nosso time de atendimento pelo chat do app ou ligue 4020 0185 (capitais e regiões metropolitanas) ou 0800 591 2117 (demais localidades). Atendimento 24h.</p>
      <p style={{ marginTop: "4px" }}>Caso a solução fornecida nos canais de atendimento não tenha sido satisfatória, fale com a Ouvidoria em 0800 887 0463 ou pelos meios disponíveis em nubank.com.br/contatos#ouvidoria. Atendimento das 8h às 18h em dias úteis.</p>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: "12px" }}>
        <span style={{ marginLeft: "25px" }}>{footerDateText}</span>
        <span>{pageNum} de {totalPages}</span>
      </div>
    </div>
  );

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Carregando extrato...</div>;
  }
  if (!data) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Erro ao carregar extrato.</div>;
  }

  const totalPages = pages ? pages.length : 1;

  return (
    <>
      <style>{`
        @media print {
          @page { size: A4; margin: 0; }
          body { margin: 0; padding: 0; }
          .extrato-toolbar { display: none !important; }
          .extrato-wrapper { padding: 0 !important; background: white !important; gap: 0 !important; }
          .a4-page { box-shadow: none !important; margin-bottom: 0 !important; }
          .a4-page { page-break-after: always; }
          .a4-page:last-child { page-break-after: avoid; }
          .measuring-container { display: none !important; }
        }
      `}</style>

      {/* Toolbar */}
      <div className="extrato-toolbar bg-secondary/30 border-b border-border px-6 py-4 flex items-center gap-4 sticky top-0 z-50">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-bold text-foreground flex-1">Pré-visualização do Extrato</h1>
        <Button variant="hero" onClick={handlePrint}>
          <Printer className="h-4 w-4 mr-2" /> Imprimir / Salvar PDF
        </Button>
      </div>

      {/* Hidden measuring container */}
      <div
        ref={measuringRef}
        className="measuring-container"
        style={{
          position: "absolute",
          top: "-99999px",
          left: "-99999px",
          width: `${A4_W - 2 * PAD_SIDE}mm`,
          ...pageStyle,
          visibility: "hidden",
        }}
      >
        {blocks}
      </div>

      {/* Rendered pages */}
      <div className="extrato-wrapper flex flex-col items-center py-8 gap-8 bg-secondary/30 min-h-screen print:py-0 print:gap-0">
        {pages ? (
          pages.map((blockIndices, pageIdx) => (
            <div
              key={pageIdx}
              className="a4-page bg-white shadow-lg"
              style={{
                width: `${A4_W}mm`,
                height: `${A4_H}mm`,
                position: "relative",
                overflow: "hidden",
                ...pageStyle,
              }}
            >
              {/* Page content */}
              <div style={{
                padding: `${PAD_TOP}mm ${PAD_SIDE}mm ${FOOTER_ZONE}mm ${PAD_SIDE}mm`,
                overflow: "hidden",
                height: "100%",
                boxSizing: "border-box",
              }}>
                {/* Header on EVERY page */}
                <PageHeader />

                {/* Content blocks for this page */}
                {blockIndices.map(i => (
                  <div key={i}>{blocks[i]}</div>
                ))}
              </div>

              {/* Footer */}
              <PageFooter pageNum={pageIdx + 1} totalPages={totalPages} />
            </div>
          ))
        ) : (
          <div className="a4-page bg-white shadow-lg" style={{ width: `${A4_W}mm`, minHeight: `${A4_H}mm`, position: "relative", ...pageStyle }}>
            <div style={{ padding: `${PAD_TOP}mm ${PAD_SIDE}mm ${FOOTER_ZONE}mm ${PAD_SIDE}mm` }}>
              <PageHeader />
              {blocks}
            </div>
            <PageFooter pageNum={1} totalPages={1} />
          </div>
        )}
      </div>
    </>
  );
};

export default ExtratoExport;
