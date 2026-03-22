# Wanas Perfumes Web App

This is a modern, mobile-responsive web application for managing your perfume business. 
It was built using React, Vite, and Tailwind CSS.

## Features
1. **Pricing Calculator**: Calculate total costs and your recommended selling price based on bottle size, empty bottle price, and oil prices.
2. **Order Management**: A Kanban-style board to track orders from "Pending" to "Prepared" and finally "Sold".
3. **Accounting Dashboard**: Automatically calculates Total Revenue, Total Profit (20%), and Reinvestment Fund (5%) securely derived from your "Sold" orders.

## How to Run This Project

It appears that `Node.js` and `npm` are not currently installed on your system. To run this app, follow these steps:

1. **Install Node.js**:
   Go to [https://nodejs.org/](https://nodejs.org/) and download the "LTS" (Long Term Support) installer for Windows, then install it.

2. **Open Terminal**:
   Open a terminal (Command Prompt or PowerShell) and navigate to this folder:
   ```cmd
   cd "C:\Users\EL MOSTAWREDV MF\.gemini\antigravity\scratch\perfume-app"
   ```

3. **Install Dependencies**:
   Run the following command to download React and Tailwind dependencies:
   ```cmd
   npm install
   ```

4. **Add Images**:
   Take your logo (`Gemini_Generated_Image_huj0guhuj0guhuj0.png`) and your product image (`d.png`) and place them inside the `public/` folder within this directory. This ensures they load correctly on the site!

5. **Start the App**:
   Run this command to start the development server:
   ```cmd
   npm run dev
   ```
   Open the Local URL (usually `http://localhost:5173`) in your web browser to use the app.

## Future Supabase Integration
Currently, the app uses React's local state. When you are ready to connect a real-time database, we can install `@supabase/supabase-js`, instantiate the client, and swap out the local `useState` arrays for real database queries!
