import './CREATISLogo.css';

import { Icon } from '@ohif/ui';
import React from 'react';

function CREATISLogo() {
  return (
    <a
      target="_blank"
      rel="noopener noreferrer"
      className="header-brand"
      href="https://www.creatis.insa-lyon.fr"
    >
      <Icon name="creatis-logo" className="header-logo-image"/>
      <Icon name="awesomme-text" className="header-logo-text" heigh="1px"/>
    </a>
  );
}

export default CREATISLogo;
