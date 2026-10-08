import { RouterProvider } from "react-router-dom";
import ICSLogo from "../components/common/ICSLogo";
import { useLoginTransitionStore } from "../features/auth/loginTransitionStore";
import { router } from "./router";

export default function App() {
  const isTransitioning = useLoginTransitionStore((state) => state.isTransitioning);
  const finishTransition = useLoginTransitionStore((state) => state.finish);

  return (
    <>
      <RouterProvider router={router} />
      {isTransitioning && (
        <div
          aria-hidden="true"
          className="login-transition-overlay"
          onAnimationEnd={(event) => {
            if (event.target === event.currentTarget) finishTransition();
          }}
        >
          <ICSLogo className="login-transition-logo" />
        </div>
      )}
    </>
  );
}
