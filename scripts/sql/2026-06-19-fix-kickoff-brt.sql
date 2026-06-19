-- Corrige kickoff_at de matches (fase de grupos + mata-mata) pro horário
-- oficial real da Copa do Mundo 2026, em horário de Brasília (BRT, UTC-3).
--
-- Por que: o seed.ts originalmente atribuiu horários fictícios/placeholder
-- (13h/15h/17h -03:00 por slot do dia) que não correspondem ao calendário
-- oficial real da FIFA. Esse script substitui pelo horário real verificado.
--
-- Como foi montado: cada UPDATE casa por (team_a, team_b) — par único em
-- toda a tabela, já que cada confronto de fase de grupos só ocorre uma vez.
-- O timestamp já embute o offset -03:00 (BRT fixo, sem horário de verão),
-- então o valor armazenado fica em UTC correto independente de onde o
-- script é executado.
--
-- ATENÇÃO sobre datas "virando a noite": alguns jogos têm horário local nos
-- EUA tarde da noite, que cruza a meia-noite em BRT (ex: jogo do dia 13 nos
-- EUA cai 01:00 do dia 14 em Brasília). Usei a data/hora BRT literal nesses
-- casos (a coluna `round` continua "R1"/"R2"/"R3", não é afetada).
--
-- Confiança:
--   PARTE 1 (fase de grupos, 72 jogos) — ALTA. Verificado em 2+ fontes
--   independentes; os 4 jogos do Brasil confirmados batem exatamente com
--   o que você reportou (Brasil x Haiti 21:30 BRT etc).
--   PARTE 2 (mata-mata, 32 jogos) — MÉDIA-ALTA. Times ainda são TBD (NULL
--   nessa tabela global), então o UPDATE usa o `id` (r32-1, r16-1, etc).
--   A ordem desses ids é cronológica (não é o número oficial de partida da
--   FIFA, que não é sequencial) — é só pra manter um placeholder de
--   data/hora/local coerente até as equipes serem definidas. Recomendo
--   conferir contra o PDF oficial da FIFA antes de rodar essa parte se
--   quiser 100% de certeza.
--
-- Como rodar: dentro de uma transação. Se algum UPDATE retornar "UPDATE 0"
-- (nenhuma linha afetada — provável mismatch de código de time), pare e
-- rode ROLLBACK em vez de COMMIT.

BEGIN;

-- ════════════════════════════════════════════════════════════
-- PARTE 1 — Fase de grupos (72 jogos), confiança ALTA
-- ════════════════════════════════════════════════════════════

-- Rodada 1
UPDATE matches SET kickoff_at = '2026-06-11T16:00:00-03:00' WHERE team_a = 'MEX' AND team_b = 'RSA'; -- México x África do Sul
UPDATE matches SET kickoff_at = '2026-06-11T23:00:00-03:00' WHERE team_a = 'KOR' AND team_b = 'CZE'; -- Coreia do Sul x República Tcheca
UPDATE matches SET kickoff_at = '2026-06-12T16:00:00-03:00' WHERE team_a = 'CAN' AND team_b = 'BIH'; -- Canadá x Bósnia e Herzegovina
UPDATE matches SET kickoff_at = '2026-06-12T22:00:00-03:00' WHERE team_a = 'USA' AND team_b = 'PAR'; -- Estados Unidos x Paraguai
UPDATE matches SET kickoff_at = '2026-06-13T16:00:00-03:00' WHERE team_a = 'QAT' AND team_b = 'SUI'; -- Catar x Suíça
UPDATE matches SET kickoff_at = '2026-06-13T19:00:00-03:00' WHERE team_a = 'BRA' AND team_b = 'MAR'; -- Brasil x Marrocos
UPDATE matches SET kickoff_at = '2026-06-13T22:00:00-03:00' WHERE team_a = 'HAI' AND team_b = 'SCO'; -- Haiti x Escócia
UPDATE matches SET kickoff_at = '2026-06-14T01:00:00-03:00' WHERE team_a = 'AUS' AND team_b = 'TUR'; -- Austrália x Turquia (cruza meia-noite, era dia 13 nos EUA)
UPDATE matches SET kickoff_at = '2026-06-14T14:00:00-03:00' WHERE team_a = 'GER' AND team_b = 'CUW'; -- Alemanha x Curaçao
UPDATE matches SET kickoff_at = '2026-06-14T20:00:00-03:00' WHERE team_a = 'CIV' AND team_b = 'ECU'; -- Costa do Marfim x Equador
UPDATE matches SET kickoff_at = '2026-06-14T17:00:00-03:00' WHERE team_a = 'NED' AND team_b = 'JPN'; -- Holanda x Japão
UPDATE matches SET kickoff_at = '2026-06-14T23:00:00-03:00' WHERE team_a = 'SWE' AND team_b = 'TUN'; -- Suécia x Tunísia
UPDATE matches SET kickoff_at = '2026-06-15T16:00:00-03:00' WHERE team_a = 'BEL' AND team_b = 'EGY'; -- Bélgica x Egito
UPDATE matches SET kickoff_at = '2026-06-15T22:00:00-03:00' WHERE team_a = 'IRN' AND team_b = 'NZL'; -- Irã x Nova Zelândia
UPDATE matches SET kickoff_at = '2026-06-15T13:00:00-03:00' WHERE team_a = 'ESP' AND team_b = 'CPV'; -- Espanha x Cabo Verde
UPDATE matches SET kickoff_at = '2026-06-15T19:00:00-03:00' WHERE team_a = 'KSA' AND team_b = 'URU'; -- Arábia Saudita x Uruguai
UPDATE matches SET kickoff_at = '2026-06-16T16:00:00-03:00' WHERE team_a = 'FRA' AND team_b = 'SEN'; -- França x Senegal
UPDATE matches SET kickoff_at = '2026-06-16T19:00:00-03:00' WHERE team_a = 'IRQ' AND team_b = 'NOR'; -- Iraque x Noruega
UPDATE matches SET kickoff_at = '2026-06-16T22:00:00-03:00' WHERE team_a = 'ARG' AND team_b = 'ALG'; -- Argentina x Argélia
UPDATE matches SET kickoff_at = '2026-06-17T01:00:00-03:00' WHERE team_a = 'AUT' AND team_b = 'JOR'; -- Áustria x Jordânia (cruza meia-noite, era dia 16 nos EUA)
UPDATE matches SET kickoff_at = '2026-06-17T14:00:00-03:00' WHERE team_a = 'POR' AND team_b = 'COD'; -- Portugal x RD Congo
UPDATE matches SET kickoff_at = '2026-06-17T23:00:00-03:00' WHERE team_a = 'UZB' AND team_b = 'COL'; -- Uzbequistão x Colômbia
UPDATE matches SET kickoff_at = '2026-06-17T17:00:00-03:00' WHERE team_a = 'ENG' AND team_b = 'CRO'; -- Inglaterra x Croácia
UPDATE matches SET kickoff_at = '2026-06-17T20:00:00-03:00' WHERE team_a = 'GHA' AND team_b = 'PAN'; -- Gana x Panamá

-- Rodada 2
UPDATE matches SET kickoff_at = '2026-06-18T13:00:00-03:00' WHERE team_a = 'CZE' AND team_b = 'RSA'; -- República Tcheca x África do Sul
UPDATE matches SET kickoff_at = '2026-06-18T22:00:00-03:00' WHERE team_a = 'MEX' AND team_b = 'KOR'; -- México x Coreia do Sul
UPDATE matches SET kickoff_at = '2026-06-18T16:00:00-03:00' WHERE team_a = 'SUI' AND team_b = 'BIH'; -- Suíça x Bósnia e Herzegovina
UPDATE matches SET kickoff_at = '2026-06-18T19:00:00-03:00' WHERE team_a = 'CAN' AND team_b = 'QAT'; -- Canadá x Catar
UPDATE matches SET kickoff_at = '2026-06-19T19:00:00-03:00' WHERE team_a = 'SCO' AND team_b = 'MAR'; -- Escócia x Marrocos
UPDATE matches SET kickoff_at = '2026-06-19T21:30:00-03:00' WHERE team_a = 'BRA' AND team_b = 'HAI'; -- Brasil x Haiti
UPDATE matches SET kickoff_at = '2026-06-19T16:00:00-03:00' WHERE team_a = 'USA' AND team_b = 'AUS'; -- Estados Unidos x Austrália
UPDATE matches SET kickoff_at = '2026-06-20T00:00:00-03:00' WHERE team_a = 'TUR' AND team_b = 'PAR'; -- Turquia x Paraguai (cruza meia-noite, era dia 19 nos EUA)
UPDATE matches SET kickoff_at = '2026-06-20T17:00:00-03:00' WHERE team_a = 'GER' AND team_b = 'CIV'; -- Alemanha x Costa do Marfim
UPDATE matches SET kickoff_at = '2026-06-20T21:00:00-03:00' WHERE team_a = 'ECU' AND team_b = 'CUW'; -- Equador x Curaçao
UPDATE matches SET kickoff_at = '2026-06-20T14:00:00-03:00' WHERE team_a = 'NED' AND team_b = 'SWE'; -- Holanda x Suécia
UPDATE matches SET kickoff_at = '2026-06-21T01:00:00-03:00' WHERE team_a = 'TUN' AND team_b = 'JPN'; -- Tunísia x Japão (cruza meia-noite, era dia 20 nos EUA)
UPDATE matches SET kickoff_at = '2026-06-21T16:00:00-03:00' WHERE team_a = 'NZL' AND team_b = 'EGY'; -- Nova Zelândia x Egito
UPDATE matches SET kickoff_at = '2026-06-21T22:00:00-03:00' WHERE team_a = 'BEL' AND team_b = 'IRN'; -- Bélgica x Irã
UPDATE matches SET kickoff_at = '2026-06-21T13:00:00-03:00' WHERE team_a = 'ESP' AND team_b = 'KSA'; -- Espanha x Arábia Saudita
UPDATE matches SET kickoff_at = '2026-06-21T19:00:00-03:00' WHERE team_a = 'URU' AND team_b = 'CPV'; -- Uruguai x Cabo Verde
UPDATE matches SET kickoff_at = '2026-06-22T18:00:00-03:00' WHERE team_a = 'FRA' AND team_b = 'IRQ'; -- França x Iraque
UPDATE matches SET kickoff_at = '2026-06-22T21:00:00-03:00' WHERE team_a = 'NOR' AND team_b = 'SEN'; -- Noruega x Senegal
UPDATE matches SET kickoff_at = '2026-06-22T14:00:00-03:00' WHERE team_a = 'ARG' AND team_b = 'AUT'; -- Argentina x Áustria
UPDATE matches SET kickoff_at = '2026-06-22T20:00:00-03:00' WHERE team_a = 'JOR' AND team_b = 'ALG'; -- Jordânia x Argélia
UPDATE matches SET kickoff_at = '2026-06-23T14:00:00-03:00' WHERE team_a = 'POR' AND team_b = 'UZB'; -- Portugal x Uzbequistão
UPDATE matches SET kickoff_at = '2026-06-23T23:00:00-03:00' WHERE team_a = 'COL' AND team_b = 'COD'; -- Colômbia x RD Congo
UPDATE matches SET kickoff_at = '2026-06-23T17:00:00-03:00' WHERE team_a = 'ENG' AND team_b = 'GHA'; -- Inglaterra x Gana
UPDATE matches SET kickoff_at = '2026-06-23T20:00:00-03:00' WHERE team_a = 'PAN' AND team_b = 'CRO'; -- Panamá x Croácia

-- Rodada 3
UPDATE matches SET kickoff_at = '2026-06-24T22:00:00-03:00' WHERE team_a = 'CZE' AND team_b = 'MEX'; -- República Tcheca x México
UPDATE matches SET kickoff_at = '2026-06-24T22:00:00-03:00' WHERE team_a = 'RSA' AND team_b = 'KOR'; -- África do Sul x Coreia do Sul
UPDATE matches SET kickoff_at = '2026-06-24T16:00:00-03:00' WHERE team_a = 'SUI' AND team_b = 'CAN'; -- Suíça x Canadá
UPDATE matches SET kickoff_at = '2026-06-24T16:00:00-03:00' WHERE team_a = 'BIH' AND team_b = 'QAT'; -- Bósnia e Herzegovina x Catar
UPDATE matches SET kickoff_at = '2026-06-24T19:00:00-03:00' WHERE team_a = 'SCO' AND team_b = 'BRA'; -- Escócia x Brasil
UPDATE matches SET kickoff_at = '2026-06-24T19:00:00-03:00' WHERE team_a = 'MAR' AND team_b = 'HAI'; -- Marrocos x Haiti
UPDATE matches SET kickoff_at = '2026-06-25T23:00:00-03:00' WHERE team_a = 'TUR' AND team_b = 'USA'; -- Turquia x Estados Unidos
UPDATE matches SET kickoff_at = '2026-06-25T23:00:00-03:00' WHERE team_a = 'PAR' AND team_b = 'AUS'; -- Paraguai x Austrália
UPDATE matches SET kickoff_at = '2026-06-25T17:00:00-03:00' WHERE team_a = 'ECU' AND team_b = 'GER'; -- Equador x Alemanha
UPDATE matches SET kickoff_at = '2026-06-25T17:00:00-03:00' WHERE team_a = 'CUW' AND team_b = 'CIV'; -- Curaçao x Costa do Marfim
UPDATE matches SET kickoff_at = '2026-06-25T20:00:00-03:00' WHERE team_a = 'TUN' AND team_b = 'NED'; -- Tunísia x Holanda
UPDATE matches SET kickoff_at = '2026-06-25T20:00:00-03:00' WHERE team_a = 'JPN' AND team_b = 'SWE'; -- Japão x Suécia
UPDATE matches SET kickoff_at = '2026-06-27T00:00:00-03:00' WHERE team_a = 'EGY' AND team_b = 'IRN'; -- Egito x Irã (cruza meia-noite, era dia 26 nos EUA)
UPDATE matches SET kickoff_at = '2026-06-27T00:00:00-03:00' WHERE team_a = 'NZL' AND team_b = 'BEL'; -- Nova Zelândia x Bélgica (cruza meia-noite, era dia 26 nos EUA)
UPDATE matches SET kickoff_at = '2026-06-26T21:00:00-03:00' WHERE team_a = 'CPV' AND team_b = 'KSA'; -- Cabo Verde x Arábia Saudita
UPDATE matches SET kickoff_at = '2026-06-26T21:00:00-03:00' WHERE team_a = 'URU' AND team_b = 'ESP'; -- Uruguai x Espanha
UPDATE matches SET kickoff_at = '2026-06-26T16:00:00-03:00' WHERE team_a = 'NOR' AND team_b = 'FRA'; -- Noruega x França
UPDATE matches SET kickoff_at = '2026-06-26T16:00:00-03:00' WHERE team_a = 'SEN' AND team_b = 'IRQ'; -- Senegal x Iraque
UPDATE matches SET kickoff_at = '2026-06-27T23:00:00-03:00' WHERE team_a = 'JOR' AND team_b = 'ARG'; -- Jordânia x Argentina
UPDATE matches SET kickoff_at = '2026-06-27T23:00:00-03:00' WHERE team_a = 'ALG' AND team_b = 'AUT'; -- Argélia x Áustria
UPDATE matches SET kickoff_at = '2026-06-27T20:30:00-03:00' WHERE team_a = 'COL' AND team_b = 'POR'; -- Colômbia x Portugal
UPDATE matches SET kickoff_at = '2026-06-27T20:30:00-03:00' WHERE team_a = 'COD' AND team_b = 'UZB'; -- RD Congo x Uzbequistão
UPDATE matches SET kickoff_at = '2026-06-27T18:00:00-03:00' WHERE team_a = 'PAN' AND team_b = 'ENG'; -- Panamá x Inglaterra
UPDATE matches SET kickoff_at = '2026-06-27T18:00:00-03:00' WHERE team_a = 'CRO' AND team_b = 'GHA'; -- Croácia x Gana

-- Verificação: deve retornar 72
SELECT count(*) AS deveria_ser_72 FROM matches WHERE stage = 'group';

-- ════════════════════════════════════════════════════════════
-- PARTE 2 — Mata-mata (32 jogos), confiança MÉDIA-ALTA
-- Times ainda TBD nessa tabela global — casa por id (placeholder
-- criado pelo seed.ts). Ordem cronológica, não número oficial FIFA.
-- ════════════════════════════════════════════════════════════

-- Oitavas-de-final (R32) — a partir de 2026-06-28
UPDATE matches SET kickoff_at = '2026-06-28T16:00:00-03:00', venue = 'SoFi Stadium, Inglewood' WHERE id = 'r32-1';
UPDATE matches SET kickoff_at = '2026-06-29T14:00:00-03:00', venue = 'NRG Stadium, Houston' WHERE id = 'r32-2';
UPDATE matches SET kickoff_at = '2026-06-29T17:30:00-03:00', venue = 'Gillette Stadium, Foxborough' WHERE id = 'r32-3';
UPDATE matches SET kickoff_at = '2026-06-29T22:00:00-03:00', venue = 'Estadio BBVA, Guadalupe' WHERE id = 'r32-4';
UPDATE matches SET kickoff_at = '2026-06-30T14:00:00-03:00', venue = 'AT&T Stadium, Arlington' WHERE id = 'r32-5';
UPDATE matches SET kickoff_at = '2026-06-30T18:00:00-03:00', venue = 'MetLife Stadium, East Rutherford' WHERE id = 'r32-6';
UPDATE matches SET kickoff_at = '2026-06-30T22:00:00-03:00', venue = 'Estadio Azteca, Mexico City' WHERE id = 'r32-7';
UPDATE matches SET kickoff_at = '2026-07-01T13:00:00-03:00', venue = 'Mercedes-Benz Stadium, Atlanta' WHERE id = 'r32-8';
UPDATE matches SET kickoff_at = '2026-07-01T17:00:00-03:00', venue = 'Lumen Field, Seattle' WHERE id = 'r32-9';
UPDATE matches SET kickoff_at = '2026-07-01T21:00:00-03:00', venue = 'Levi''s Stadium, Santa Clara' WHERE id = 'r32-10';
UPDATE matches SET kickoff_at = '2026-07-02T16:00:00-03:00', venue = 'SoFi Stadium, Inglewood' WHERE id = 'r32-11';
UPDATE matches SET kickoff_at = '2026-07-02T20:00:00-03:00', venue = 'BMO Field, Toronto' WHERE id = 'r32-12';
UPDATE matches SET kickoff_at = '2026-07-03T00:00:00-03:00', venue = 'BC Place, Vancouver' WHERE id = 'r32-13'; -- cruza meia-noite, era dia 2 nos EUA
UPDATE matches SET kickoff_at = '2026-07-03T15:00:00-03:00', venue = 'AT&T Stadium, Arlington' WHERE id = 'r32-14';
UPDATE matches SET kickoff_at = '2026-07-03T19:00:00-03:00', venue = 'Hard Rock Stadium, Miami Gardens' WHERE id = 'r32-15';
UPDATE matches SET kickoff_at = '2026-07-03T22:30:00-03:00', venue = 'Arrowhead Stadium, Kansas City' WHERE id = 'r32-16';

-- Quartas de oitavas (R16) — a partir de 2026-07-04
UPDATE matches SET kickoff_at = '2026-07-04T14:00:00-03:00', venue = 'NRG Stadium, Houston' WHERE id = 'r16-1';
UPDATE matches SET kickoff_at = '2026-07-04T18:00:00-03:00', venue = 'Lincoln Financial Field, Philadelphia' WHERE id = 'r16-2';
UPDATE matches SET kickoff_at = '2026-07-05T17:00:00-03:00', venue = 'MetLife Stadium, East Rutherford' WHERE id = 'r16-3';
UPDATE matches SET kickoff_at = '2026-07-05T21:00:00-03:00', venue = 'Estadio Azteca, Mexico City' WHERE id = 'r16-4';
UPDATE matches SET kickoff_at = '2026-07-06T16:00:00-03:00', venue = 'AT&T Stadium, Arlington' WHERE id = 'r16-5';
UPDATE matches SET kickoff_at = '2026-07-06T21:00:00-03:00', venue = 'Lumen Field, Seattle' WHERE id = 'r16-6';
UPDATE matches SET kickoff_at = '2026-07-07T13:00:00-03:00', venue = 'Mercedes-Benz Stadium, Atlanta' WHERE id = 'r16-7';
UPDATE matches SET kickoff_at = '2026-07-07T17:00:00-03:00', venue = 'BC Place, Vancouver' WHERE id = 'r16-8';

-- Quartas-de-final (QF) — a partir de 2026-07-09
UPDATE matches SET kickoff_at = '2026-07-09T17:00:00-03:00', venue = 'Gillette Stadium, Foxborough' WHERE id = 'qf-1';
UPDATE matches SET kickoff_at = '2026-07-10T16:00:00-03:00', venue = 'SoFi Stadium, Inglewood' WHERE id = 'qf-2';
UPDATE matches SET kickoff_at = '2026-07-11T18:00:00-03:00', venue = 'Hard Rock Stadium, Miami Gardens' WHERE id = 'qf-3';
UPDATE matches SET kickoff_at = '2026-07-11T22:00:00-03:00', venue = 'Arrowhead Stadium, Kansas City' WHERE id = 'qf-4';

-- Semifinais (SF) — a partir de 2026-07-14
UPDATE matches SET kickoff_at = '2026-07-14T16:00:00-03:00', venue = 'AT&T Stadium, Arlington' WHERE id = 'sf-1';
UPDATE matches SET kickoff_at = '2026-07-15T16:00:00-03:00', venue = 'Mercedes-Benz Stadium, Atlanta' WHERE id = 'sf-2';

-- Terceiro lugar e Final
UPDATE matches SET kickoff_at = '2026-07-18T18:00:00-03:00', venue = 'Hard Rock Stadium, Miami Gardens' WHERE id = 'tp-1';
UPDATE matches SET kickoff_at = '2026-07-19T16:00:00-03:00', venue = 'MetLife Stadium, East Rutherford' WHERE id = 'final-1';

-- Verificação: deve retornar 32
SELECT count(*) AS deveria_ser_32 FROM matches WHERE stage IN ('r32', 'r16', 'qf', 'sf', 'tp', 'final');

-- Se as duas contagens acima baterem (72 e 32) e nenhum UPDATE acima
-- retornou "UPDATE 0", rode COMMIT. Caso contrário, ROLLBACK.
COMMIT;
