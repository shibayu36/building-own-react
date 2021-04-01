// eslint-disable-next-line @typescript-eslint/no-unused-vars
const Didact = {
  createElement,
};

/** @jsx Didact.createElement */
const element = (
  <div id="foo">
    <a>bar</a>
    <b />
  </div>
);
console.log(element);
// const container = document.getElementById("root");
// ReactDOM.render(element, container);

function createElement(type: string, props: DidactProps = {}, ...children: DidactChild[]): DidactElement {
  return {
    type,
    props: {
      ...props,
      children: children.map((child) => (typeof child === "object" ? child : createTextElement(child))),
    },
  };
}

function createTextElement(text: DidactText): DidactElement {
  return {
    type: "TEXT_ELEMENT",
    props: {
      nodeValue: text,
      children: [],
    },
  };
}

type DidactElement = {
  type: string;
  props: DidactProps;
};
type DidactText = string | number;
type DidactChild = DidactElement | DidactText;
type DidactProps = {
  children?: DidactElement[];
  [key: string]: any;
} | null;

export {};
