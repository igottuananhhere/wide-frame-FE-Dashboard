import { Link } from "react-router-dom";
import type { LinkProps } from "react-router-dom";
import { useOutletContext } from "react-router-dom";
import type { DashboardLocationContextValue } from "../../features/building/types";
import { withFloorScope } from "../../features/building/scopedPath";

type ScopedDashboardLinkProps = Omit<LinkProps, "to"> & { to: string };

export default function ScopedDashboardLink({ to, ...props }: ScopedDashboardLinkProps) {
  const context = useOutletContext<DashboardLocationContextValue | null>();
  const floorId = context?.floorId;
  return <Link {...props} to={withFloorScope(to, floorId)} />;
}
