declare namespace JSX {
  interface IntrinsicElements {
    [elemName: string]: any;
  }
}
declare module "react/jsx-runtime" {
  const anyExport: any;
  export default anyExport;
}
