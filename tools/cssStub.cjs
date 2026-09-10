/**
 * Was Jest aus einem `import './irgendwas.css'` macht: nichts.
 *
 * Vite bündelt CSS-Importe, Jest kennt sie nicht — und eine Suite, die an
 * einer geschweiften Klammer in einer Stildatei scheitert, sagt nichts über
 * den Code aus. Vorher stand in jeder betroffenen Testdatei ein eigenes
 * `jest.mock('./…css')`; das war eine Zeile, die man beim nächsten Import
 * vergisst, und dann fällt eine Suite mit „Unexpected token '.'" um.
 */
module.exports = {};
