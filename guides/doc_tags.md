Static
{client_name} 
{testing_company_name}
{testing_start_date} 
{testing_end_date} 
{testing_duration}
{testing_mode}
{revisioner_name}
{revisioner_role}
{revisioner_date}
{approver_name}
{approver_date}
{executive_summary}



Dynamic
{#targets}
	{name}
	{url}
	{severity}
{/targets} 


{#credentials} 
	{username}
	{description}
{/credentials} 


{#testers}
	{name}
	{role}
	{date}
{/testers}


{#vulnerabilities}
	{name}
	{severity}
	{priority}
	{cvss_score}
	{cvss_vector}
	{description}
	{impact}
	{#endpoints}
		{index}
		{http_method}
		{path}
		{parameter}
	{/endpoints}
	{#attacks}
  		{#if type=='text'}
    			{text}
  		{/if}
  		{#if type=='image'}
    			{image}
    			{caption}
  		{/if}
	{/attacks}
	{remediation}
{/vulnerabilities}







