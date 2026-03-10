import { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Printer } from "lucide-react";
import { apiGet } from "@/lib/api";
import logoNu from "@/assets/logonu.png";

const ExtratoExport = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const contaId = searchParams.get("conta_id") || "";
  const dataInicio = searchParams.get("data_inicio") || "";
  const dataFim = searchParams.get("data_fim") || "";

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!contaId || !dataInicio || !dataFim) return;
    apiGet("extrato.php", { conta_id: contaId, data_inicio: dataInicio, data_fim: dataFim })
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [contaId, dataInicio, dataFim]);

  const fmt = (v: number) =>
    v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const handlePrint = () => window.print();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Carregando extrato...</div>;
  }

  if (!data) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Erro ao carregar extrato.</div>;
  }

  const conta = data.conta || {};
  const resumo = data.resumo || {};
  const movimentacoes = data.movimentacoes || {};
  const datasOrdenadas = Object.keys(movimentacoes).sort();

  const fmtPeriodo = (d: string) =>
    new Date(d + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" }).toUpperCase();

  const fmtDia = (d: string) => {
    const dt = new Date(d + "T12:00:00");
    const day = String(dt.getDate()).padStart(2, "0");
    const months = ["JAN","FEV","MAR","ABR","MAI","JUN","JUL","AGO","SET","OUT","NOV","DEZ"];
    return `${day} ${months[dt.getMonth()]} ${dt.getFullYear()}`;
  };

  const saldoPorDia: Record<string, number> = {};
  {
    let saldoAcumulado = resumo.saldo_inicial || 0;
    for (const dia of datasOrdenadas) {
      const trans = movimentacoes[dia];
      for (const t of trans) {
        if (t.tipo === "entrada") saldoAcumulado += parseFloat(t.valor);
        else saldoAcumulado -= parseFloat(t.valor);
      }
      saldoPorDia[dia] = saldoAcumulado;
    }
  }

  const footerDateText = `Extrato gerado dia ${new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })} às ${new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;

  const pageStyle: React.CSSProperties = {
    fontFamily: "'Graphik', 'Helvetica Neue', Helvetica, Arial, sans-serif",
    fontWeight: 400,
    fontSize: "12px",
    lineHeight: "1.8",
    color: "#222",
  };

  const footerContent = (
    <>
      <p>Tem alguma dúvida? Mande uma mensagem para nosso time de atendimento pelo chat do app ou ligue 4020 0185 (capitais e regiões metropolitanas) ou 0800 591 2117 (demais localidades). Atendimento 24h.</p>
      <p style={{ marginTop: "4px" }}>Caso a solução fornecida nos canais de atendimento não tenha sido satisfatória, fale com a Ouvidoria em 0800 887 0463 ou pelos meios disponíveis em nubank.com.br/contatos#ouvidoria. Atendimento das 8h às 18h em dias úteis.</p>
    </>
  );

  return (
    <>
      <style>{`
        @media print {
          @page {
            size: A4;
            margin: 15mm;
            margin-bottom: 45mm;
          }
          body { margin: 0; padding: 0; }

          .extrato-print-footer {
            position: fixed;
            bottom: -30mm;
            left: 0;
            right: 0;
            font-size: 8px;
            color: #888;
            line-height: 1.45;
            border-top: 1.5px solid #ccc;
            padding-top: 8px;
            font-family: 'Graphik', 'Helvetica Neue', Helvetica, Arial, sans-serif;
          }
          .extrato-print-footer .efp-row {
            display: flex;
            justify-content: space-between;
            margin-top: 6px;
          }
          .extrato-print-footer .efp-page::after {
            content: counter(page);
          }

          .extrato-screen-footer { display: none !important; }
          .extrato-toolbar { display: none !important; }
          .extrato-wrapper { padding: 0 !important; background: white !important; }
          .extrato-page { 
            box-shadow: none !important; 
            padding: 0 !important;
            width: 100% !important;
            min-height: auto !important;
          }
        }
      `}</style>

      {/* Fixed footer for print - appears on every printed page */}
      <div className="extrato-print-footer" style={{ display: "none" }}>
        {footerContent}
        <div className="efp-row">
          <span>{footerDateText}</span>
          <span className="efp-page"></span>
        </div>
      </div>
      {/* Make it visible only in print */}
      <style>{`.extrato-print-footer { display: none; } @media print { .extrato-print-footer { display: block !important; } }`}</style>

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

      {/* Content */}
      <div className="extrato-wrapper flex justify-center py-8 bg-secondary/30 min-h-screen">
        <div className="extrato-page bg-white shadow-lg w-[210mm] min-h-[297mm] px-[15mm] py-[20mm]" style={pageStyle}>
          
          {/* HEADER */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "40px" }}>
            <img src={logoNu} alt="Nu" style={{ height: "32px", width: "auto" }} />
            <div style={{ textAlign: "right", fontSize: "13px", lineHeight: "1.8" }}>
              <p style={{ fontWeight: 400 }}>{conta.titular}</p>
              <p>
                <span style={{ fontWeight: 700 }}>{conta.tipo_conta === "PJ" ? "CNPJ" : "CPF"}</span>{"  "}{conta.documento}{"  "}
                <span style={{ fontWeight: 700 }}>Agência</span>{"  "}{conta.agencia || "0001"}{"  "}
                <span style={{ fontWeight: 700 }}>Conta</span>
              </p>
              <p>{conta.numero_conta}</p>
            </div>
          </div>

          {/* PERÍODO */}
          <div style={{ borderBottom: "2px solid #ccc", paddingBottom: "8px", marginBottom: "24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <span style={{ fontWeight: 700, fontSize: "13px" }}>
                {fmtPeriodo(dataInicio)} a {fmtPeriodo(dataFim)}
              </span>
              <span style={{ fontSize: "13px", color: "#666" }}>VALORES EM R$</span>
            </div>
          </div>

          {/* RESUMO */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px" }}>
            <div style={{ paddingTop: "8px" }}>
              <p style={{ fontSize: "12px", color: "#000", marginBottom: "6px", fontWeight: 700 }}>Saldo final do período</p>
              <p style={{ fontSize: "22px", fontWeight: 700, color: "#820AD1", lineHeight: "1.2" }}>
                R$ {fmt(resumo.saldo_final)}
              </p>
            </div>
            <table style={{ fontSize: "13px", borderCollapse: "collapse", minWidth: "320px" }}>
              <tbody>
                <tr>
                  <td style={{ fontWeight: 700, padding: "3px 16px 3px 0" }}>Saldo inicial</td>
                  <td style={{ textAlign: "right", padding: "3px 0" }}>{fmt(resumo.saldo_inicial)}</td>
                </tr>
                <tr>
                  <td style={{ padding: "3px 16px 3px 0", color: "#444" }}>Rendimento líquido</td>
                  <td style={{ textAlign: "right", padding: "3px 0" }}>+{fmt(resumo.rendimento_liquido)}</td>
                </tr>
                <tr>
                  <td style={{ padding: "3px 16px 3px 0", color: "#444" }}>Total de entradas</td>
                  <td style={{ textAlign: "right", padding: "3px 0" }}>+{fmt(resumo.total_entradas)}</td>
                </tr>
                <tr>
                  <td style={{ padding: "3px 16px 3px 0", color: "#444" }}>Total de saídas</td>
                  <td style={{ textAlign: "right", padding: "3px 0" }}>-{fmt(resumo.total_saidas)}</td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 700, padding: "6px 16px 3px 0" }}>Saldo final do período</td>
                  <td style={{ fontWeight: 700, textAlign: "right", padding: "6px 0 3px 0" }}>{fmt(resumo.saldo_final)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* MOVIMENTAÇÕES */}
          <div style={{ borderBottom: "2px solid #ccc", marginBottom: "4px" }}></div>
          <div style={{ marginBottom: "16px" }}>
            <span style={{ fontWeight: 700, fontSize: "13px" }}>Movimentações</span>
          </div>

          {datasOrdenadas.length === 0 && (
            <p style={{ textAlign: "center", color: "#999", padding: "20px 0" }}>Nenhuma movimentação encontrada no período.</p>
          )}

          {datasOrdenadas.map(dia => {
            const trans = movimentacoes[dia];
            const entradas = trans.filter((t: any) => t.tipo === "entrada");
            const saidas = trans.filter((t: any) => t.tipo === "saida");
            const totalE = entradas.reduce((s: number, t: any) => s + parseFloat(t.valor), 0);
            const totalS = saidas.reduce((s: number, t: any) => s + parseFloat(t.valor), 0);
            const dateShownInEntradas = entradas.length > 0;

            return (
              <div key={dia} style={{ pageBreakInside: "avoid" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                  <tbody>
                    {entradas.length > 0 && (
                      <>
                        <tr>
                          <td style={{ width: "110px", verticalAlign: "top", padding: "14px 16px 14px 0", color: "#222" }}>{fmtDia(dia)}</td>
                          <td style={{ fontWeight: 700, padding: "14px 0", verticalAlign: "top" }}>Total de entradas</td>
                          <td style={{ padding: "14px 0" }}></td>
                          <td style={{ fontWeight: 700, textAlign: "right", padding: "14px 0 14px 24px", whiteSpace: "nowrap", verticalAlign: "top" }}>+ {fmt(totalE)}</td>
                        </tr>
                        {entradas.map((t: any, i: number) => (
                          <tr key={t.id || i}>
                            <td style={{ padding: "8px 16px 8px 0" }}></td>
                            <td style={{ padding: "8px 0", verticalAlign: "top", width: "200px" }}>{t.descricao}</td>
                            <td style={{ padding: "8px 8px", verticalAlign: "top", color: "#555", fontSize: "11.5px", lineHeight: "2.5" }}>
                              {t.beneficiario_nome} - {t.beneficiario_documento} - {t.beneficiario_banco}{t.beneficiario_banco_codigo ? ` (${t.beneficiario_banco_codigo})` : ""} Agência: {t.beneficiario_agencia} Conta: {t.beneficiario_conta}
                            </td>
                            <td style={{ textAlign: "right", padding: "8px 0 8px 24px", verticalAlign: "top", whiteSpace: "nowrap" }}>{fmt(parseFloat(t.valor))}</td>
                          </tr>
                        ))}
                      </>
                    )}

                    {saidas.length > 0 && (
                      <>
                        <tr>
                          <td style={{ width: "110px", verticalAlign: "top", padding: "14px 16px 14px 0", color: "#222" }}>{!dateShownInEntradas ? fmtDia(dia) : ""}</td>
                          <td style={{ fontWeight: 700, padding: "14px 0", verticalAlign: "top" }}>Total de saídas</td>
                          <td style={{ padding: "14px 0" }}></td>
                          <td style={{ fontWeight: 700, textAlign: "right", padding: "14px 0 14px 24px", whiteSpace: "nowrap", verticalAlign: "top" }}>- {fmt(totalS)}</td>
                        </tr>
                        {saidas.map((t: any, i: number) => (
                          <tr key={t.id || i}>
                            <td style={{ padding: "8px 16px 8px 0" }}></td>
                            <td style={{ padding: "8px 0", verticalAlign: "top", width: "200px" }}>{t.descricao}</td>
                            <td style={{ padding: "8px 8px", verticalAlign: "top", color: "#555", fontSize: "11.5px", lineHeight: "2.5" }}>
                              {t.beneficiario_nome} - {t.beneficiario_documento} - {t.beneficiario_banco}{t.beneficiario_banco_codigo ? ` (${t.beneficiario_banco_codigo})` : ""} Agência: {t.beneficiario_agencia} Conta: {t.beneficiario_conta}
                            </td>
                            <td style={{ textAlign: "right", padding: "8px 0 8px 24px", verticalAlign: "top", whiteSpace: "nowrap" }}>{fmt(parseFloat(t.valor))}</td>
                          </tr>
                        ))}
                      </>
                    )}

                    <tr style={{ borderBottom: "2px solid #ccc" }}>
                      <td style={{ padding: "14px 16px 14px 0" }}></td>
                      <td style={{ fontWeight: 700, padding: "14px 0" }}>Saldo do dia</td>
                      <td style={{ padding: "14px 0" }}></td>
                      <td style={{ fontWeight: 700, textAlign: "right", padding: "14px 0 14px 24px" }}>{fmt(saldoPorDia[dia])}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            );
          })}

          {/* DISCLAIMER + EMPRESAS */}
          <div style={{ marginTop: "40px", pageBreakInside: "avoid" }}>
            <div style={{ borderTop: "1px solid #ddd", paddingTop: "16px", fontSize: "10px", color: "#555", lineHeight: "1.6" }}>
              <p>O saldo líquido corresponde ao total de depósitos e rendimentos em conta, não considerando movimentações feitas após a data mencionada.</p>
              <p>Não nos responsabilizamos pelo uso indevido ou por alterações das informações originalmente contidas neste documento após envio.</p>
              <p>Asseguramos a autenticidade destas movimentações e das informações aqui citadas.</p>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginTop: "20px", fontSize: "11.5px", lineHeight: "1.6", color: "#222" }}>
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

          {/* Screen-only footer (visible in preview, hidden in print) */}
          <div className="extrato-screen-footer" style={{ marginTop: "32px", borderTop: "2px solid #ccc", paddingTop: "16px", fontSize: "9px", color: "#888", lineHeight: "1.5" }}>
            {footerContent}
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: "12px" }}>
              <span>{footerDateText}</span>
              <span>1 de 1</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ExtratoExport;
