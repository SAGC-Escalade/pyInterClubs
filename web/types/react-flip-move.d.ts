// react-flip-move ne fournit pas de types ; déclaration minimale.
declare module "react-flip-move" {
  import * as React from "react";
  interface FlipMoveProps {
    children?: React.ReactNode;
    typeName?: string | null;
    className?: string;
    duration?: number;
    easing?: string;
    appearAnimation?: string | boolean;
    enterAnimation?: string | boolean;
    leaveAnimation?: string | boolean;
    maintainContainerHeight?: boolean;
    [key: string]: unknown;
  }
  const FlipMove: React.ComponentType<FlipMoveProps>;
  export default FlipMove;
}
