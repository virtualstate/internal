import { useOrganisations } from "../data";

export const path = "/organisations";
export const cache = true;

export function Organisations() {
  const organisations = useOrganisations();
  return (
    <div className="organisation-list">
      {organisations.map((organisation, index) => (
        <div key={index} className="organisation-list-item">
          <div className="organisation-list-item-name">
            {organisation.organisationName}
          </div>
        </div>
      ))}
    </div>
  );
}

export const Component = Organisations;