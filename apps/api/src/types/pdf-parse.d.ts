declare module "pdf-parse/lib/pdf-parse.js" {
  function pdfParse(dataBuffer: Buffer, options?: object): Promise<{ text: string }>;
  export default pdfParse;
}
