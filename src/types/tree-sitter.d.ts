// declare module "tree-sitter";
declare module "tree-sitter-capnp";

// declare module "tree-sitter" {
//
//     export interface Language {
//         nodeTypeInfo: unknown
//     }
//
//     export interface Node {
//         toString(): string;
//         child(index: number): Node;
//         firstChild: Node;
//         lastChild: Node;
//
//     }
//
//     export interface Tree {
//         rootNode: Node
//     }
//
//     export default class Parser {
//         setLanguage(language: Language): void;
//         parse(source: string): Tree
//     }
//
// }
//
// declare module "tree-sitter-capnp" {
//
//     import { Language } from "tree-sitter";
//
//     const Capnp: Language
//
//     export default Capnp;
// }