import { ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";
import type { AssetException } from "../../features/dashboard/types";
import StatusBadge from "./StatusBadge";

type AssetExceptionTableProps = { items: readonly AssetException[] };

export default function AssetExceptionTable({ items }: AssetExceptionTableProps) {
  return (
    <div className="asset-table-scroll">
      <table className="asset-exception-table" aria-label="Asset exceptions">
        <thead>
          <tr>
            <th scope="col">Device</th>
            <th scope="col">Type</th>
            <th scope="col">Area</th>
            <th scope="col">Status</th>
            <th scope="col">Issue</th>
            <th scope="col">Action</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <th scope="row"><span className="asset-id">{item.id}</span></th>
              <td>{item.type}</td>
              <td>{item.area}</td>
              <td><StatusBadge status={item.status} /></td>
              <td>{item.issue}</td>
              <td>
                <Link className="asset-action-link" to="/dashboard/assets" aria-label={`${item.actionLabel}: ${item.id}`}>
                  {item.actionLabel}<ArrowUpRight aria-hidden="true" size={14} />
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
