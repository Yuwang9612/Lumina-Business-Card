<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Lumina Logic LLC Report</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    body { font-family: 'Inter', system-ui, sans-serif; background: #f4f4f5; margin: 0; padding: 40px 0; }
    .container { max-width: 1024px; margin: 0 auto; background: white; border-radius: 24px; overflow: hidden; box-shadow: 0 25px 50px -12px rgb(0 0 0 / 0.25); }
    .header { background: linear-gradient(to right, #18181b, #000); color: white; padding: 48px 48px 40px; }
    .header h1 { font-size: 42px; font-weight: 700; margin: 0; }
    .header p { font-size: 20px; color: #a1a1aa; margin: 8px 0 0; }
    .content { padding: 48px; }
    .snapshot { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; margin-bottom: 48px; }
    .card { background: white; border: 1px solid #e4e4e7; border-radius: 16px; padding: 28px; box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1); }
    .card p:first-child { font-size: 13px; color: #71717a; margin: 0 0 8px; }
    .card .big { font-size: 42px; font-weight: 700; }
    .action { margin: 0 48px 32px; background: white; border: 1px solid #e4e4e7; border-radius: 16px; padding: 32px; box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1); display: flex; justify-content: space-between; align-items: flex-start; }
    .action .tag { padding: 4px 16px; border-radius: 9999px; font-size: 12px; font-weight: 600; }
    .action .tag.high { background: #fee2e2; color: #b91c1c; }
    .action .tag.low { background: #dbeafe; color: #1e40af; }
    .action h3 { font-size: 22px; font-weight: 600; margin: 16px 0 8px; }
    .loss { font-size: 32px; font-weight: 700; color: #b91c1c; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Lumina Logic LLC</h1>
      <p>Protecting your profits. Powering your business.</p>
    </div>
    <div class="content">
      <div class="snapshot">
        <div class="card">
          <p>Recurring Net</p>
          <p class="big text-red-600">{{ recurring_net }}</p>
        </div>
        <div class="card">
          <p>Optimized Net</p>
          <p class="big text-emerald-600">{{ optimized_net|default:'$100' }}</p>
        </div>
        <div class="card">
          <p>Unlock</p>
          <p class="big text-emerald-600">{{ unlock|default:'+$500' }}</p>
        </div>
      </div>
      {% for action in actions %}
      <div class="action">
        <div>
          <span class="tag {% if action.level == 'HIGH' %}high{% else %}low{% endif %}">{{ action.level }}</span>
          <h3>{{ action.name }}</h3>
          <p style="color:#52525b; margin:8px 0;">{{ action.desc }}</p>
          <p style="color:#3f3f46; font-weight:500;">{{ action.todo }}</p>
        </div>
        <div class="loss">{{ action.loss }}</div>
      </div>
      {% endfor %}
    </div>
  </div>
</body>
</html>