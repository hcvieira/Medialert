/**
 * MediAlert — Seed Realistic 2-Year Scenario (Batch Optimized)
 */

import mysql from "mysql2/promise";
import bcrypt from "bcryptjs";

const ADMIN_ID = 570001;

interface DoctorSeed {
  name: string; email: string; crm: string; crmState: string; specialty: string;
  phone: string; bio: string; address: string; insurances: string[];
  feeByInsurance: Record<string, number>; joinedMonthsAgo: number;
  mgmLevel: number; referredByIndex?: number; apptRange: [number, number];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function randomItem<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function genRefCode(): string {
  const c = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; let s = "";
  for (let i = 0; i < 8; i++) s += c[Math.floor(Math.random() * c.length)]; return s;
}
function dateMonthsAgo(m: number): Date { const d = new Date(); d.setMonth(d.getMonth() - m); return d; }
function fmtDate(d: Date): string { return d.toISOString().slice(0, 10); }
function fmtMonth(d: Date): string { return d.toISOString().slice(0, 7); }
function rndTime(): string {
  return `${String(randomInt(7, 18)).padStart(2, "0")}:${String(randomItem([0, 15, 30, 45])).padStart(2, "0")}`;
}

// 35 doctors
const doctors: DoctorSeed[] = [
  // FOUNDERS (5) — ~24 months ago
  { name: "Dr. Ricardo Mendes", email: "ricardo.mendes@medialert.com", crm: "123456", crmState: "SP", specialty: "Cardiologia", phone: "(11) 99876-5432", bio: "Cardiologista com 15 anos de experiência em cardiologia intervencionista.", address: "Av. Paulista, 1578 - São Paulo - SP", insurances: ["Unimed", "Bradesco Saúde", "SulAmérica", "Particular"], feeByInsurance: { "Unimed": 450, "Bradesco Saúde": 480, "SulAmérica": 460, "Particular": 600 }, joinedMonthsAgo: 24, mgmLevel: 0, apptRange: [50, 60] },
  { name: "Dra. Camila Ferreira", email: "camila.ferreira@medialert.com", crm: "234567", crmState: "RJ", specialty: "Dermatologia", phone: "(21) 98765-4321", bio: "Dermatologista especializada em dermatologia estética e clínica.", address: "Rua Visconde de Pirajá, 330 - Rio de Janeiro - RJ", insurances: ["Amil", "NotreDame Intermédica", "Bradesco Saúde", "Particular"], feeByInsurance: { "Amil": 500, "NotreDame Intermédica": 480, "Bradesco Saúde": 520, "Particular": 700 }, joinedMonthsAgo: 24, mgmLevel: 0, apptRange: [48, 58] },
  { name: "Dr. Fernando Alves", email: "fernando.alves@medialert.com", crm: "345678", crmState: "MG", specialty: "Ortopedia", phone: "(31) 97654-3210", bio: "Ortopedista e traumatologista com foco em cirurgia do joelho e ombro.", address: "Rua da Bahia, 1148 - Belo Horizonte - MG", insurances: ["Unimed", "Hapvida", "SulAmérica", "Particular"], feeByInsurance: { "Unimed": 480, "Hapvida": 380, "SulAmérica": 470, "Particular": 650 }, joinedMonthsAgo: 23, mgmLevel: 0, apptRange: [52, 60] },
  { name: "Dra. Juliana Costa", email: "juliana.costa@medialert.com", crm: "456789", crmState: "RS", specialty: "Ginecologia", phone: "(51) 96543-2109", bio: "Ginecologista e obstetra com experiência em gestação de alto risco.", address: "Av. Carlos Gomes, 700 - Porto Alegre - RS", insurances: ["Unimed", "Bradesco Saúde", "Amil", "Particular"], feeByInsurance: { "Unimed": 420, "Bradesco Saúde": 440, "Amil": 430, "Particular": 580 }, joinedMonthsAgo: 22, mgmLevel: 0, apptRange: [47, 55] },
  { name: "Dr. Marcos Oliveira", email: "marcos.oliveira@medialert.com", crm: "567890", crmState: "PR", specialty: "Neurologia", phone: "(41) 95432-1098", bio: "Neurologista com especialização em epilepsia e doenças neurodegenerativas.", address: "Rua XV de Novembro, 1200 - Curitiba - PR", insurances: ["SulAmérica", "Unimed", "NotreDame Intermédica", "Particular"], feeByInsurance: { "SulAmérica": 520, "Unimed": 500, "NotreDame Intermédica": 490, "Particular": 750 }, joinedMonthsAgo: 24, mgmLevel: 0, apptRange: [45, 55] },
  // LEVEL 1 (11) — 10-18 months ago
  { name: "Dr. André Santos", email: "andre.santos@medialert.com", crm: "678901", crmState: "SP", specialty: "Pediatria", phone: "(11) 94321-0987", bio: "Pediatra com foco em neonatologia e desenvolvimento infantil.", address: "Rua Oscar Freire, 2100 - São Paulo - SP", insurances: ["Unimed", "Amil", "Particular"], feeByInsurance: { "Unimed": 350, "Amil": 360, "Particular": 480 }, joinedMonthsAgo: 18, mgmLevel: 1, referredByIndex: 0, apptRange: [48, 58] },
  { name: "Dra. Beatriz Lima", email: "beatriz.lima@medialert.com", crm: "789012", crmState: "SP", specialty: "Endocrinologia", phone: "(11) 93210-9876", bio: "Endocrinologista especializada em diabetes e tireoide.", address: "Av. Brasil, 1500 - São Paulo - SP", insurances: ["Bradesco Saúde", "SulAmérica", "Particular"], feeByInsurance: { "Bradesco Saúde": 460, "SulAmérica": 450, "Particular": 620 }, joinedMonthsAgo: 16, mgmLevel: 1, referredByIndex: 0, apptRange: [46, 56] },
  { name: "Dr. Carlos Eduardo Rocha", email: "carlos.rocha@medialert.com", crm: "890123", crmState: "RJ", specialty: "Oftalmologia", phone: "(21) 92109-8765", bio: "Oftalmologista com especialização em cirurgia refrativa e catarata.", address: "Av. Atlântica, 4240 - Rio de Janeiro - RJ", insurances: ["Amil", "Bradesco Saúde", "Particular"], feeByInsurance: { "Amil": 400, "Bradesco Saúde": 420, "Particular": 550 }, joinedMonthsAgo: 15, mgmLevel: 1, referredByIndex: 1, apptRange: [50, 58] },
  { name: "Dra. Diana Souza", email: "diana.souza@medialert.com", crm: "901234", crmState: "RJ", specialty: "Psiquiatria", phone: "(21) 91098-7654", bio: "Psiquiatra com foco em transtornos de ansiedade e depressão.", address: "Rua Dias Ferreira, 190 - Rio de Janeiro - RJ", insurances: ["SulAmérica", "NotreDame Intermédica", "Particular"], feeByInsurance: { "SulAmérica": 550, "NotreDame Intermédica": 520, "Particular": 800 }, joinedMonthsAgo: 14, mgmLevel: 1, referredByIndex: 1, apptRange: [45, 52] },
  { name: "Dr. Eduardo Martins", email: "eduardo.martins@medialert.com", crm: "012345", crmState: "MG", specialty: "Gastroenterologia", phone: "(31) 90987-6543", bio: "Gastroenterologista com experiência em endoscopia.", address: "Av. Afonso Pena, 3111 - Belo Horizonte - MG", insurances: ["Unimed", "Hapvida", "Particular"], feeByInsurance: { "Unimed": 440, "Hapvida": 360, "Particular": 580 }, joinedMonthsAgo: 17, mgmLevel: 1, referredByIndex: 2, apptRange: [47, 55] },
  { name: "Dra. Fernanda Ribeiro", email: "fernanda.ribeiro@medialert.com", crm: "112233", crmState: "MG", specialty: "Clínica Geral", phone: "(31) 98876-5432", bio: "Clínica geral com ênfase em medicina preventiva.", address: "Rua Espírito Santo, 800 - Belo Horizonte - MG", insurances: ["Hapvida", "Unimed", "Amil", "Particular"], feeByInsurance: { "Hapvida": 300, "Unimed": 320, "Amil": 310, "Particular": 400 }, joinedMonthsAgo: 16, mgmLevel: 1, referredByIndex: 2, apptRange: [55, 65] },
  { name: "Dr. Gabriel Pereira", email: "gabriel.pereira@medialert.com", crm: "223344", crmState: "RS", specialty: "Urologia", phone: "(51) 97765-4321", bio: "Urologista com especialização em cirurgia robótica.", address: "Rua Padre Chagas, 300 - Porto Alegre - RS", insurances: ["Unimed", "Bradesco Saúde", "Particular"], feeByInsurance: { "Unimed": 430, "Bradesco Saúde": 450, "Particular": 600 }, joinedMonthsAgo: 13, mgmLevel: 1, referredByIndex: 3, apptRange: [46, 54] },
  { name: "Dra. Helena Nunes", email: "helena.nunes@medialert.com", crm: "334455", crmState: "RS", specialty: "Dermatologia", phone: "(51) 96654-3210", bio: "Dermatologista com foco em dermatoscopia e melanoma.", address: "Av. Independência, 1299 - Porto Alegre - RS", insurances: ["SulAmérica", "Amil", "Particular"], feeByInsurance: { "SulAmérica": 500, "Amil": 490, "Particular": 680 }, joinedMonthsAgo: 12, mgmLevel: 1, referredByIndex: 3, apptRange: [48, 56] },
  { name: "Dr. Igor Campos", email: "igor.campos@medialert.com", crm: "445566", crmState: "PR", specialty: "Cardiologia", phone: "(41) 95543-2109", bio: "Cardiologista com foco em arritmias cardíacas.", address: "Rua Comendador Araújo, 500 - Curitiba - PR", insurances: ["Unimed", "NotreDame Intermédica", "Particular"], feeByInsurance: { "Unimed": 450, "NotreDame Intermédica": 430, "Particular": 620 }, joinedMonthsAgo: 15, mgmLevel: 1, referredByIndex: 4, apptRange: [49, 57] },
  { name: "Dra. Larissa Moreira", email: "larissa.moreira@medialert.com", crm: "556677", crmState: "PR", specialty: "Ginecologia", phone: "(41) 94432-1098", bio: "Ginecologista com especialização em endometriose.", address: "Av. Sete de Setembro, 4698 - Curitiba - PR", insurances: ["Bradesco Saúde", "Unimed", "Particular"], feeByInsurance: { "Bradesco Saúde": 420, "Unimed": 410, "Particular": 560 }, joinedMonthsAgo: 10, mgmLevel: 1, referredByIndex: 4, apptRange: [47, 55] },
  { name: "Dr. Thiago Barbosa", email: "thiago.barbosa@medialert.com", crm: "667788", crmState: "BA", specialty: "Ortopedia", phone: "(71) 93321-0987", bio: "Ortopedista especializado em coluna vertebral.", address: "Av. Tancredo Neves, 1632 - Salvador - BA", insurances: ["Hapvida", "Unimed", "Particular"], feeByInsurance: { "Hapvida": 380, "Unimed": 480, "Particular": 620 }, joinedMonthsAgo: 11, mgmLevel: 1, referredByIndex: 0, apptRange: [50, 58] },
  // LEVEL 2 (19) — 2-8 months ago
  { name: "Dra. Mariana Teixeira", email: "mariana.teixeira@medialert.com", crm: "778899", crmState: "SP", specialty: "Pediatria", phone: "(11) 92210-9876", bio: "Pediatra com foco em alergologia infantil.", address: "Rua Augusta, 2800 - São Paulo - SP", insurances: ["Unimed", "Amil", "Particular"], feeByInsurance: { "Unimed": 350, "Amil": 360, "Particular": 470 }, joinedMonthsAgo: 8, mgmLevel: 2, referredByIndex: 5, apptRange: [45, 52] },
  { name: "Dr. Rafael Azevedo", email: "rafael.azevedo@medialert.com", crm: "889900", crmState: "SP", specialty: "Clínica Geral", phone: "(19) 91109-8765", bio: "Clínico geral com experiência em medicina do trabalho.", address: "Av. Dr. Moraes Sales, 1100 - Campinas - SP", insurances: ["Unimed", "SulAmérica", "Particular"], feeByInsurance: { "Unimed": 300, "SulAmérica": 320, "Particular": 420 }, joinedMonthsAgo: 7, mgmLevel: 2, referredByIndex: 6, apptRange: [48, 55] },
  { name: "Dra. Patrícia Duarte", email: "patricia.duarte@medialert.com", crm: "990011", crmState: "RJ", specialty: "Neurologia", phone: "(21) 90098-7654", bio: "Neurologista com foco em cefaleia e dor crônica.", address: "Rua São Clemente, 400 - Rio de Janeiro - RJ", insurances: ["Amil", "Bradesco Saúde", "Particular"], feeByInsurance: { "Amil": 520, "Bradesco Saúde": 540, "Particular": 720 }, joinedMonthsAgo: 6, mgmLevel: 2, referredByIndex: 7, apptRange: [42, 48] },
  { name: "Dr. Vinícius Cardoso", email: "vinicius.cardoso@medialert.com", crm: "001122", crmState: "RJ", specialty: "Otorrinolaringologia", phone: "(21) 98987-6543", bio: "Otorrino com experiência em cirurgia nasal e apneia.", address: "Av. das Américas, 3500 - Rio de Janeiro - RJ", insurances: ["NotreDame Intermédica", "Amil", "Particular"], feeByInsurance: { "NotreDame Intermédica": 410, "Amil": 420, "Particular": 560 }, joinedMonthsAgo: 5, mgmLevel: 2, referredByIndex: 8, apptRange: [40, 47] },
  { name: "Dra. Isabela Cunha", email: "isabela.cunha@medialert.com", crm: "112244", crmState: "MG", specialty: "Endocrinologia", phone: "(31) 97876-5432", bio: "Endocrinologista com foco em obesidade.", address: "Rua Gonçalves Dias, 2500 - Belo Horizonte - MG", insurances: ["Unimed", "Hapvida", "Particular"], feeByInsurance: { "Unimed": 460, "Hapvida": 380, "Particular": 600 }, joinedMonthsAgo: 4, mgmLevel: 2, referredByIndex: 9, apptRange: [41, 48] },
  { name: "Dr. Lucas Monteiro", email: "lucas.monteiro@medialert.com", crm: "223355", crmState: "MG", specialty: "Pneumologia", phone: "(31) 96765-4321", bio: "Pneumologista com experiência em asma grave e DPOC.", address: "Av. do Contorno, 6000 - Belo Horizonte - MG", insurances: ["Hapvida", "Unimed", "Particular"], feeByInsurance: { "Hapvida": 350, "Unimed": 430, "Particular": 580 }, joinedMonthsAgo: 3, mgmLevel: 2, referredByIndex: 10, apptRange: [40, 46] },
  { name: "Dra. Renata Fonseca", email: "renata.fonseca@medialert.com", crm: "334466", crmState: "RS", specialty: "Oftalmologia", phone: "(51) 95654-3210", bio: "Oftalmologista com foco em glaucoma e retina.", address: "Rua Fernando Machado, 800 - Porto Alegre - RS", insurances: ["SulAmérica", "Unimed", "Particular"], feeByInsurance: { "SulAmérica": 400, "Unimed": 390, "Particular": 540 }, joinedMonthsAgo: 5, mgmLevel: 2, referredByIndex: 11, apptRange: [43, 50] },
  { name: "Dr. Gustavo Pinto", email: "gustavo.pinto@medialert.com", crm: "445577", crmState: "RS", specialty: "Gastroenterologia", phone: "(51) 94543-2109", bio: "Gastroenterologista com experiência em hepatologia.", address: "Av. Protásio Alves, 3000 - Porto Alegre - RS", insurances: ["Bradesco Saúde", "Amil", "Particular"], feeByInsurance: { "Bradesco Saúde": 440, "Amil": 430, "Particular": 590 }, joinedMonthsAgo: 4, mgmLevel: 2, referredByIndex: 12, apptRange: [42, 49] },
  { name: "Dra. Aline Machado", email: "aline.machado@medialert.com", crm: "556688", crmState: "PR", specialty: "Psiquiatria", phone: "(41) 93432-1098", bio: "Psiquiatra com foco em TDAH e transtorno bipolar.", address: "Rua Marechal Deodoro, 630 - Curitiba - PR", insurances: ["Unimed", "SulAmérica", "Particular"], feeByInsurance: { "Unimed": 550, "SulAmérica": 530, "Particular": 780 }, joinedMonthsAgo: 6, mgmLevel: 2, referredByIndex: 13, apptRange: [40, 48] },
  { name: "Dr. Bruno Nascimento", email: "bruno.nascimento@medialert.com", crm: "667799", crmState: "PR", specialty: "Cardiologia", phone: "(43) 92321-0987", bio: "Cardiologista com foco em insuficiência cardíaca.", address: "Av. Higienópolis, 500 - Londrina - PR", insurances: ["Unimed", "NotreDame Intermédica", "Particular"], feeByInsurance: { "Unimed": 450, "NotreDame Intermédica": 420, "Particular": 600 }, joinedMonthsAgo: 3, mgmLevel: 2, referredByIndex: 14, apptRange: [41, 47] },
  { name: "Dra. Carolina Vieira", email: "carolina.vieira@medialert.com", crm: "778800", crmState: "BA", specialty: "Dermatologia", phone: "(71) 91210-9876", bio: "Dermatologista com foco em pele negra e estética.", address: "Av. Paulo VI, 1800 - Salvador - BA", insurances: ["Hapvida", "Bradesco Saúde", "Particular"], feeByInsurance: { "Hapvida": 400, "Bradesco Saúde": 500, "Particular": 650 }, joinedMonthsAgo: 2, mgmLevel: 2, referredByIndex: 15, apptRange: [40, 45] },
  { name: "Dr. Daniel Freitas", email: "daniel.freitas@medialert.com", crm: "889911", crmState: "SC", specialty: "Urologia", phone: "(48) 90109-8765", bio: "Urologista com experiência em litotripsia.", address: "Rua Felipe Schmidt, 500 - Florianópolis - SC", insurances: ["Unimed", "SulAmérica", "Particular"], feeByInsurance: { "Unimed": 430, "SulAmérica": 440, "Particular": 580 }, joinedMonthsAgo: 5, mgmLevel: 2, referredByIndex: 5, apptRange: [43, 50] },
  { name: "Dra. Elisa Barros", email: "elisa.barros@medialert.com", crm: "990022", crmState: "PE", specialty: "Ginecologia", phone: "(81) 98098-7654", bio: "Ginecologista com foco em saúde da mulher.", address: "Av. Boa Viagem, 3200 - Recife - PE", insurances: ["Hapvida", "Amil", "Particular"], feeByInsurance: { "Hapvida": 350, "Amil": 420, "Particular": 550 }, joinedMonthsAgo: 7, mgmLevel: 2, referredByIndex: 9, apptRange: [46, 53] },
  { name: "Dr. Felipe Correia", email: "felipe.correia@medialert.com", crm: "001133", crmState: "CE", specialty: "Clínica Geral", phone: "(85) 97987-6543", bio: "Clínico geral com experiência em emergência.", address: "Av. Beira Mar, 2500 - Fortaleza - CE", insurances: ["Hapvida", "Unimed", "Particular"], feeByInsurance: { "Hapvida": 300, "Unimed": 320, "Particular": 400 }, joinedMonthsAgo: 8, mgmLevel: 2, referredByIndex: 10, apptRange: [50, 60] },
];

const patientNames = [
  "Ana Paula Silva","Bruno Henrique Costa","Carla Mendes","Diego Ferreira","Elaine Souza",
  "Fábio Rodrigues","Gabriela Almeida","Hugo Nascimento","Irene Barbosa","João Pedro Lima",
  "Karen Oliveira","Leonardo Santos","Marília Pereira","Nícolas Ribeiro","Olívia Martins",
  "Paulo César Duarte","Quésia Nunes","Roberto Campos","Simone Teixeira","Tiago Azevedo",
  "Úrsula Moreira","Valter Pinto","Wanda Fonseca","Xavier Machado","Yara Cunha",
  "Zélia Monteiro","Adriano Vieira","Bianca Freitas","Cássio Barros","Denise Correia",
  "Emerson Cardoso","Flávia Duarte","Gilberto Neves","Heloísa Ramos","Ivan Carvalho",
  "Jéssica Araújo","Kleber Moura","Lúcia Gomes","Márcio Lopes","Natália Dias",
  "Otávio Pires","Priscila Rocha","Quirino Melo","Rosana Brito","Sérgio Tavares",
  "Tatiana Vasconcelos","Ulisses Guimarães","Vanessa Andrade","Wagner Sousa","Ximena Nogueira",
  "Yasmin Figueiredo","Zilda Amorim","Antônio Carlos Reis","Brenda Cavalcanti","Cláudio Sampaio",
  "Daniela Pinheiro","Evandro Magalhães","Francisca Xavier","Geraldo Batista","Hilda Medeiros",
  "Inácio Borges","Joana Siqueira","Kauê Rezende","Lorena Pacheco","Murilo Coelho",
  "Noemi Esteves","Orlando Fontes","Paloma Rangel","Reginaldo Assis","Sandra Lacerda",
  "Tomás Aguiar","Uriel Bastos","Vera Lúcia Dantas","Wilson Moraes","Xuxa Fernandes",
  "Yuri Albuquerque","Zenaide Carneiro","Ademar Queiroz","Betânia Leal","Celso Marques",
  "Débora Santana","Edson Paiva","Fabiana Matos","Gerson Coutinho","Helena Braga",
  "Ítalo Sena","Juliane Prado","Leandro Bittencourt","Miriam Chagas","Nilson Alencar",
  "Odete Vargas","Pedro Henrique Luz","Raquel Menezes","Silvana Portela","Tadeu Faria",
  "Valéria Rego","Wesley Amaral","Zara Monteiro","Artur Lins","Cecília Dorneles",
  "Davi Lucca Maia","Estela Valente","Flávio Bezerra","Graziela Simões","Henrique Fontoura",
  "Isadora Pimentel","Joaquim Taveira","Lilian Espíndola","Mateus Brandão","Nair Gonçalves",
  "Osvaldo Teles","Patrícia Helena Cruz","Rogério Bonfim","Sueli Damasceno","Thales Novaes",
];

const reviewComments = [
  "Excelente profissional, muito atencioso e competente.",
  "Ótimo atendimento, recomendo a todos.",
  "Médico muito dedicado, explica tudo com paciência.",
  "Consulta rápida e eficiente. Voltarei com certeza.",
  "Profissional excepcional, ambiente muito agradável.",
  "Muito satisfeito com o atendimento e diagnóstico.",
  "Recomendo fortemente. Profissional de primeira linha.",
  "Atendimento humanizado e muito profissional.",
  "Médico muito competente, resolveu meu problema rapidamente.",
  "Excelente experiência, consultório bem equipado.",
  "Pontual e muito educado. Ótima consulta.",
  "Profissional atualizado e com boa comunicação.",
  null, null, null,
];

const noteTemplates = [
  "Paciente apresenta quadro estável. Manter medicação atual e retorno em 30 dias.",
  "Exames laboratoriais dentro da normalidade. Orientações sobre dieta e exercícios.",
  "Queixa de dor persistente. Ajuste de medicação realizado. Retorno em 15 dias.",
  "Melhora significativa desde última consulta. Redução gradual da medicação.",
  "Solicitados exames complementares para investigação. Aguardar resultados.",
  "Paciente com boa adesão ao tratamento. Manter conduta atual.",
  "Encaminhamento para especialista solicitado. Orientações fornecidas.",
  "Revisão de medicamentos. Substituição de fármaco por melhor tolerância.",
  "Paciente relata efeitos colaterais leves. Ajuste de dosagem realizado.",
  "Consulta de acompanhamento. Evolução satisfatória do quadro clínico.",
];

// ─── Batch helper ────────────────────────────────────────────────────────────
async function batchInsert(conn: mysql.Connection, table: string, columns: string[], rows: any[][]) {
  if (rows.length === 0) return;
  const CHUNK = 500;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);
    const placeholders = chunk.map(() => `(${columns.map(() => "?").join(",")})`).join(",");
    const flat = chunk.flat();
    await conn.execute(`INSERT INTO ${table} (${columns.join(",")}) VALUES ${placeholders}`, flat);
  }
}

// ─── Main ────────────────────────────────────────────────────────────────────
async function seed() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL!);
  console.log("🌱 Starting optimized realistic seed...\n");

  const passwordHash = await bcrypt.hash("Medialert@2024", 12);
  const userIds: number[] = [];
  const profileIds: number[] = [];
  const referralCodes: string[] = [];

  // ─── 1. Doctors (sequential for IDs) ──────────────────────────────────────
  console.log("👨‍⚕️ Creating 35 doctors...");
  for (let i = 0; i < doctors.length; i++) {
    const doc = doctors[i];
    const joinDate = dateMonthsAgo(doc.joinedMonthsAgo);
    const openId = `local_seed_doc_${i}_${Date.now()}`;
    const [ur] = await conn.execute(
      `INSERT INTO users (openId,name,email,loginMethod,role,appRole,passwordHash,createdAt,updatedAt,lastSignedIn) VALUES (?,?,?,'email','user','doctor',?,?,?,?)`,
      [openId, doc.name, doc.email, passwordHash, joinDate, joinDate, joinDate]
    );
    userIds.push((ur as any).insertId);
    const rc = genRefCode(); referralCodes.push(rc);
    const [pr] = await conn.execute(
      `INSERT INTO doctor_profiles (userId,crm,crmState,specialty,insurances,phone,bio,address,referralCode,onboardingCompleted,createdAt,updatedAt) VALUES (?,?,?,?,?,?,?,?,?,true,?,?)`,
      [userIds[i], doc.crm, doc.crmState, doc.specialty, JSON.stringify(doc.insurances), doc.phone, doc.bio, doc.address, rc, joinDate, joinDate]
    );
    profileIds.push((pr as any).insertId);
  }

  // ─── 2. MGM refs ──────────────────────────────────────────────────────────
  console.log("🔗 Setting MGM referral chain...");
  for (let i = 0; i < doctors.length; i++) {
    if (doctors[i].mgmLevel > 0 && doctors[i].referredByIndex !== undefined) {
      await conn.execute(`UPDATE doctor_profiles SET indicatedById=? WHERE id=?`, [profileIds[doctors[i].referredByIndex!], profileIds[i]]);
    }
  }

  // ─── 3. Insurance fees (batch) ────────────────────────────────────────────
  console.log("💳 Creating insurance fees...");
  const feeRows: any[][] = [];
  for (let i = 0; i < doctors.length; i++) {
    const jd = dateMonthsAgo(doctors[i].joinedMonthsAgo);
    for (const [ins, fee] of Object.entries(doctors[i].feeByInsurance)) {
      feeRows.push([profileIds[i], ins, fee, 0, jd, jd]);
    }
  }
  await batchInsert(conn, "doctor_insurance_fees", ["doctorProfileId","insuranceName","feeAmount","isDefault","createdAt","updatedAt"], feeRows);

  // ─── 4. Patients (sequential for IDs) ─────────────────────────────────────
  console.log("🧑 Creating patients...");
  const patientUserIds: number[] = [];
  const patientPerDoctor: Record<number, number[]> = {};
  let pIdx = 0;
  for (let i = 0; i < doctors.length; i++) {
    const np = randomInt(3, 4);
    patientPerDoctor[i] = [];
    for (let p = 0; p < np && pIdx < patientNames.length; p++) {
      const pn = patientNames[pIdx];
      const pe = `paciente.${pIdx + 1}@email.com`;
      const jd = dateMonthsAgo(doctors[i].joinedMonthsAgo - randomInt(0, 2));
      const oid = `local_seed_pat_${pIdx}_${Date.now()}`;
      const [r] = await conn.execute(
        `INSERT INTO users (openId,name,email,loginMethod,role,appRole,passwordHash,createdAt,updatedAt,lastSignedIn) VALUES (?,?,?,'email','user','patient',?,?,?,?)`,
        [oid, pn, pe, passwordHash, jd, jd, jd]
      );
      const pid = (r as any).insertId;
      patientUserIds.push(pid);
      patientPerDoctor[i].push(pid);
      pIdx++;
    }
  }
  console.log(`   Created ${pIdx} patients`);

  // ─── 5. Doctor-patient links (batch) ──────────────────────────────────────
  console.log("🔗 Linking patients to doctors...");
  const dpRows: any[][] = [];
  let linkIdx = 0;
  for (let i = 0; i < doctors.length; i++) {
    for (const pid of (patientPerDoctor[i] || [])) {
      const jd = dateMonthsAgo(doctors[i].joinedMonthsAgo);
      const by = randomInt(1955, 2000);
      const bm = String(randomInt(1, 12)).padStart(2, "0");
      const bd = String(randomInt(1, 28)).padStart(2, "0");
      dpRows.push([userIds[i], pid, String(200000 + linkIdx), 1, patientNames[linkIdx] || "Paciente", `paciente.${linkIdx+1}@email.com`,
        `(${randomInt(11,99)}) 9${randomInt(1000,9999)}-${randomInt(1000,9999)}`, `${by}-${bm}-${bd}`, randomItem(doctors[i].insurances), jd]);
      linkIdx++;
    }
  }
  await batchInsert(conn, "doctor_patients", ["doctorId","patientId","inviteCode","accepted","patientName","patientEmail","patientPhone","patientBirthDate","patientInsurancePlan","createdAt"], dpRows);

  // ─── 6. Appointments + Revenues + Reviews (batch) ─────────────────────────
  console.log("📅 Creating appointments (this is the big one)...");
  const apptRows: any[][] = [];
  const revRows: any[][] = [];
  const reviewRows: any[][] = [];
  const apptCountByDM: Record<string, number> = {};
  // We need appointment IDs for revenues, so we'll use a counter
  // First insert appointments, then query for ID range
  let apptCounter = 0;

  for (let i = 0; i < doctors.length; i++) {
    const doc = doctors[i];
    const patients = patientPerDoctor[i];
    if (!patients || patients.length === 0) continue;
    for (let m = doc.joinedMonthsAgo; m >= 0; m--) {
      const md = dateMonthsAgo(m);
      const ms = fmtMonth(md);
      const na = randomInt(doc.apptRange[0], doc.apptRange[1]);
      const key = `${i}-${ms}`;
      apptCountByDM[key] = 0;
      for (let a = 0; a < na; a++) {
        const pid = randomItem(patients);
        const day = randomInt(1, 28);
        const ds = `${ms}-${String(day).padStart(2, "0")}`;
        const tm = rndTime();
        const ins = randomItem(doc.insurances);
        const isFuture = m === 0 && day > new Date().getDate();
        const status = isFuture ? randomItem(["scheduled", "confirmed"]) : "completed";
        const ad = new Date(`${ds}T${tm}:00`);
        apptRows.push([userIds[i], pid, ds, tm, ins, doc.address, status, 1, ad, ad]);
        if (status === "completed") {
          apptCountByDM[key] = (apptCountByDM[key] || 0) + 1;
          const fee = doc.feeByInsurance[ins] || 300;
          // placeholder apptId = 0, will fix after
          revRows.push([apptCounter, profileIds[i], ins, fee, ms, ad]);
          if (Math.random() < 0.15) {
            reviewRows.push([profileIds[i], pid, apptCounter, randomInt(3, 5), randomItem(reviewComments), ad]);
          }
        }
        apptCounter++;
      }
    }
  }

  // Insert appointments in batches and get first ID
  console.log(`   Inserting ${apptRows.length} appointments...`);
  const CHUNK = 500;
  let firstApptId = 0;
  for (let i = 0; i < apptRows.length; i += CHUNK) {
    const chunk = apptRows.slice(i, i + CHUNK);
    const ph = chunk.map(() => "(?,?,?,?,?,?,?,?,?,?)").join(",");
    const [result] = await conn.execute(
      `INSERT INTO appointments (doctorId,patientId,date,time,insurance,location,status,reminderSent,createdAt,updatedAt) VALUES ${ph}`,
      chunk.flat()
    );
    if (i === 0) firstApptId = (result as any).insertId;
  }

  // Fix appointment IDs in revenue and review rows
  console.log(`   Inserting ${revRows.length} revenue records...`);
  for (const row of revRows) { row[0] = firstApptId + row[0]; }
  await batchInsert(conn, "appointment_revenues", ["appointmentId","doctorProfileId","insuranceName","feeAmount","referenceMonth","createdAt"], revRows);

  console.log(`   Inserting ${reviewRows.length} reviews...`);
  for (const row of reviewRows) { row[2] = firstApptId + row[2]; }
  await batchInsert(conn, "doctor_reviews", ["doctorId","patientId","appointmentId","rating","comment","createdAt"], reviewRows);

  console.log(`   ✓ ${apptRows.length} appointments, ${revRows.length} revenues, ${reviewRows.length} reviews`);

  // ─── 7. Commission Rules ──────────────────────────────────────────────────
  console.log("💰 Setting up discount rules (cascade discount on subscription)...");
  // Desconto em cascata na assinatura do médico indicador.
  // Nível 1: R$150 (1º ano) / R$100 (2º ano+)
  // Nível 2: R$75  (1º ano) / R$50  (2º ano+)
  // Nível 3: R$50  (1º ano) / R$25  (2º ano+)
  const rules = [
    { level: 1, year: 1, amount: 150 }, { level: 1, year: 2, amount: 100 },
    { level: 2, year: 1, amount: 75 },  { level: 2, year: 2, amount: 50 },
    { level: 3, year: 1, amount: 50 },  { level: 3, year: 2, amount: 25 },
  ];
  for (const r of rules) {
    await conn.execute(`INSERT INTO commission_rules (level,yearOfReferred,amount,active,createdAt,updatedAt) VALUES (?,?,?,true,NOW(),NOW())`, [r.level, r.year, r.amount]);
  }

  // ─── 8. Commissions Ledger ────────────────────────────────────────────────
  console.log("📊 Calculating commissions...");
  const commRows: any[][] = [];
  let paidCount = 0, pendingCount = 0;

  for (let i = 0; i < doctors.length; i++) {
    const doc = doctors[i];
    if (doc.mgmLevel === 0) continue;
    const eligibleStart = doc.joinedMonthsAgo - 6;
    if (eligibleStart <= 0) continue;

    const chain: { pid: number; level: number }[] = [];
    if (doc.referredByIndex !== undefined) {
      chain.push({ pid: profileIds[doc.referredByIndex], level: 1 });
      const parent = doctors[doc.referredByIndex];
      if (parent.referredByIndex !== undefined) {
        chain.push({ pid: profileIds[parent.referredByIndex], level: 2 });
        const gp = doctors[parent.referredByIndex];
        if (gp.referredByIndex !== undefined) {
          chain.push({ pid: profileIds[gp.referredByIndex], level: 3 });
        }
      }
    }

    for (let m = eligibleStart; m >= 1; m--) {
      const cm = dateMonthsAgo(m);
      const ms = fmtMonth(cm);
      const key = `${i}-${ms}`;
      const ac = apptCountByDM[key] || 0;
      if (ac < 45) continue;

      const monthsSinceStart = eligibleStart - m;
      const yr = Math.min(Math.floor(monthsSinceStart / 12) + 1, 2);

      for (const { pid, level } of chain) {
        const rule = rules.find(r => r.level === level && r.year === yr);
        if (!rule) continue;
        const isPaid = m > 1;
        const pa = isPaid ? new Date(cm.getFullYear(), cm.getMonth() + 1, 10) : null;
        commRows.push([pid, profileIds[i], level, ms, ac, yr, rule.amount, isPaid ? "paid" : "pending", pa, cm]);
        if (isPaid) paidCount++; else pendingCount++;
      }
    }
  }
  await batchInsert(conn, "commissions_ledger", ["referrerId","referredId","level","referenceMonth","appointmentsCount","yearOfReferred","amount","status","paidAt","createdAt"], commRows);
  console.log(`   ✓ ${commRows.length} commissions (${paidCount} paid, ${pendingCount} pending)`);

  // ─── 9. Clinical Notes (batch) ────────────────────────────────────────────
  console.log("📝 Creating clinical notes...");
  const noteRows: any[][] = [];
  for (let i = 0; i < doctors.length; i++) {
    for (const pid of (patientPerDoctor[i] || [])) {
      const nn = randomInt(2, 5);
      for (let n = 0; n < nn; n++) {
        const nd = dateMonthsAgo(randomInt(0, doctors[i].joinedMonthsAgo));
        noteRows.push([userIds[i], pid, randomItem(noteTemplates), nd, nd]);
      }
    }
  }
  await batchInsert(conn, "clinical_notes", ["doctorId","patientId","note","createdAt","updatedAt"], noteRows);
  console.log(`   ✓ ${noteRows.length} clinical notes`);

  // ─── 10. Notifications (batch) ────────────────────────────────────────────
  console.log("🔔 Creating notifications...");
  const notifRows: any[][] = [];
  for (let i = 0; i < doctors.length; i++) {
    const jd = dateMonthsAgo(doctors[i].joinedMonthsAgo);
    notifRows.push([profileIds[i], "welcome", "Bem-vindo ao MediAlert!", "Seu perfil foi criado com sucesso. Explore as funcionalidades do app.", null, 1, jd]);
    if (doctors[i].mgmLevel === 0) {
      for (let n = 0; n < randomInt(3, 6); n++) {
        const nd = dateMonthsAgo(randomInt(1, 12));
        notifRows.push([profileIds[i], "commission_paid", "Comissão Paga!", `Sua comissão de R$${randomInt(100,500)},00 referente ao mês ${fmtMonth(nd)} foi depositada.`, null, Math.random() > 0.3 ? 1 : 0, nd]);
      }
    }
    for (let n = 0; n < randomInt(1, 3); n++) {
      const nd = dateMonthsAgo(randomInt(0, 3));
      notifRows.push([profileIds[i], "consultation_request", "Nova Solicitação de Consulta", `${randomItem(patientNames)} solicitou uma consulta.`, null, Math.random() > 0.5 ? 1 : 0, nd]);
    }
  }
  await batchInsert(conn, "doctor_notifications", ["doctorId","type","title","body","referenceId","isRead","createdAt"], notifRows);
  console.log(`   ✓ ${notifRows.length} notifications`);

  // ─── 11. Consultation Requests (batch) ────────────────────────────────────
  console.log("📞 Creating consultation requests...");
  const reqRows: any[][] = [];
  for (let i = 0; i < doctors.length; i++) {
    for (let r = 0; r < randomInt(2, 5); r++) {
      const pid = randomItem(patientUserIds);
      const rd = dateMonthsAgo(randomInt(0, 3));
      const msgs = ["Gostaria de agendar uma consulta.", "Preciso de uma avaliação.", "Indicação de amigo, gostaria de marcar.", null];
      reqRows.push([pid, profileIds[i], `(${randomInt(11,99)}) 9${randomInt(1000,9999)}-${randomInt(1000,9999)}`, randomItem(msgs), randomItem(["pending","contacted","contacted","contacted"]), rd]);
    }
  }
  await batchInsert(conn, "consultation_requests", ["patientId","doctorId","phone","message","status","createdAt"], reqRows);
  console.log(`   ✓ ${reqRows.length} consultation requests`);

  // ─── Summary ──────────────────────────────────────────────────────────────
  console.log("\n════════════════════════════════════════════════════════════");
  console.log("✅ SEED COMPLETE!");
  console.log("════════════════════════════════════════════════════════════");
  console.log(`👨‍⚕️ Doctors: ${doctors.length}`);
  console.log(`   ├─ Founders (Level 0): 5 (joined ~24 months ago)`);
  console.log(`   ├─ Level 1 (referred by founders): 11 (joined 10-18 months ago)`);
  console.log(`   └─ Level 2 (referred by level-1): 19 (joined 2-8 months ago)`);
  console.log(`🧑 Patients: ${pIdx}`);
  console.log(`📅 Appointments: ${apptRows.length}`);
  console.log(`💵 Revenues: ${revRows.length}`);
  console.log(`⭐ Reviews: ${reviewRows.length}`);
  console.log(`💰 Commissions: ${commRows.length} (${paidCount} paid, ${pendingCount} pending)`);
  console.log(`📝 Clinical Notes: ${noteRows.length}`);
  console.log(`🔔 Notifications: ${notifRows.length}`);
  console.log(`📞 Consultation Requests: ${reqRows.length}`);
  console.log("════════════════════════════════════════════════════════════");
  console.log("\n🔑 All doctors login: [email]@medialert.com / Medialert@2024");
  console.log("🔑 All patients login: paciente.[N]@email.com / Medialert@2024");

  await conn.end();
}

seed().catch(console.error);
