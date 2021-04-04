// eslint-disable-next-line @typescript-eslint/no-unused-vars
const Didact = {
  createElement,
  render,
};

// ここ独自実装に差し替えられるの面白い
/** @jsx Didact.createElement */
const element = (
  <div id="foo">
    <a>bar</a>
    <b />
  </div>
);
const container = document.getElementById("root");
Didact.render(element, container);

requestIdleCallback(workLoop);

let nextUnitOfWork: any = null;
function workLoop(deadline: IdleDeadline): void {
  let shouldYield = false;
  while (nextUnitOfWork && !shouldYield) {
    nextUnitOfWork = performUnitOfWork(nextUnitOfWork);
    shouldYield = deadline.timeRemaining() < 1;
  }
  requestIdleCallback(workLoop);
}

function performUnitOfWork(nextUnitOfWork: any): any {
  // TODO
}

function createElement(type: string, props: DidactProps = { children: [] }, ...children: DidactChild[]): DidactElement {
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
  props: DidactProps | null;
};
type DidactText = string | number;
type DidactChild = DidactElement | DidactText;
type DidactProps = {
  children: DidactElement[];
  [key: string]: any;
};

function render(element: DidactElement, container: HTMLElement | null): void {
  if (container === null) return;

  if (element.type === "TEXT_ELEMENT") {
    const dom = document.createTextNode(element.props?.nodeValue ?? "");
    container.appendChild(dom);
  } else {
    const dom = document.createElement(element.type);
    if (element.props !== null) {
      for (const [key, value] of Object.entries(element.props)) {
        if (!isAttribute(key)) continue;
        dom.setAttribute(key, value);
      }
      element.props.children.forEach((child) => render(child, dom));
    }
    container.appendChild(dom);
  }
}

function createDom(fiber: DidactElement): Text | HTMLElement {
  if (element.type === "TEXT_ELEMENT") {
    return document.createTextNode(element.props?.nodeValue ?? "");
  } else {
    const dom = document.createElement(element.type);
    if (element.props !== null) {
      for (const [key, value] of Object.entries(element.props)) {
        if (!isAttribute(key)) continue;
        dom.setAttribute(key, value);
      }
    }
    return dom;
  }
}

function isAttribute(propName: string): boolean {
  // jsxをtransformするときに__selfや__sourceを入れてくるので抜いている
  return propName !== "children" && propName !== "__self" && propName !== "__source";
}

export {};
