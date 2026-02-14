import React from 'react';
import COPYRIGHT_CONFIG from '../config/copyrightConfig';
import './Copyright.css';

const Copyright = () => {
  const { author, year, company } = COPYRIGHT_CONFIG;
  
  const copyrightText = company 
    ? `© ${year} ${company}. All rights reserved.`
    : `© ${year} ${author}. All rights reserved.`;

  return (
    <div className="copyright-footer">
      <p>{copyrightText}</p>
    </div>
  );
};

export default Copyright;
