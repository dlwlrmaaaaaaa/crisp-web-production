import React, { useEffect, useState } from "react";
import {
  onSnapshot,
  collection,
  getFirestore,
  query,
  where,
} from "firebase/firestore";
import { Pie } from "react-chartjs-2";
import { app } from "../Firebase/firebaseConfig";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";

const db = getFirestore(app);

// Register the components
ChartJS.register(ArcElement, Tooltip, Legend);

const PieChart = () => {
  const [reportCounts, setReportCounts] = useState({});
  const [dateFilter, setDateFilter] = useState("month");

  // Helper function to get the start of a day, week, month, or year
  const getStartOfPeriod = (filter) => {
    const now = new Date();
    switch (filter) {
      case "today":
        now.setHours(0, 0, 0, 0);
        return now;
      case "week":
        const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
        startOfWeek.setHours(0, 0, 0, 0);
        return startOfWeek;
      case "month":
        now.setDate(1); // Set to the first day of the current month
        now.setHours(0, 0, 0, 0);
        return now;
      case "year":
        now.setMonth(0, 1); // Set to the first day of the current year
        now.setHours(0, 0, 0, 0);
        return now;
      default:
        return null; // All-time (no filter)
    }
  };

  const fetchDocuments = async (filter) => {
    // Reset counts to avoid displaying stale data
    setReportCounts({});

    const categories = [
      "fires",
      "street lights",
      "potholes",
      "floods",
      "others",
      "road accident",
    ];

    const unsubscribeFunctions = categories.map((category) => {
      let q = collection(db, `reports/${category}/reports`);

      if (filter !== "all") {
        const startOfPeriod = getStartOfPeriod(filter);
        if (startOfPeriod) {
          // If filter is applied, fetch reports after the specified date
          q = query(q, where("report_date", ">=", startOfPeriod.toISOString()));
        }
      }

      console.log(`Fetching reports for ${category} with filter: ${filter}`);
      return onSnapshot(q, (snapshot) => {
        const count = snapshot.docs.length; // Count the number of documents in each category
        console.log(`${category} count:`, count); // Debug log to verify count
        setReportCounts((prevCounts) => ({
          ...prevCounts,
          [category]: count, // Replace the previous count with the current count
        }));
      });
    });

    // Cleanup function to unsubscribe from listeners when the component unmounts
    return () => {
      unsubscribeFunctions.forEach((unsubscribe) => unsubscribe());
    };
  };

  useEffect(() => {
    fetchDocuments(dateFilter);
  }, [dateFilter]); // Fetch data whenever the date filter changes

  // Prepare data for the chart
  const chartData = {
    labels: Object.keys(reportCounts),
    datasets: [
      {
        data: Object.values(reportCounts),
        backgroundColor: [
          "rgba(255, 99, 132, 0.6)", // Fires
          "rgba(54, 162, 235, 0.6)", // Street Lights
          "rgba(255, 206, 86, 0.6)", // Potholes
          "rgba(75, 192, 192, 0.6)", // Floods
          "rgba(153, 102, 255, 0.6)", // Others
          "rgba(255, 159, 64, 0.6)", // Road Accident
        ],
        borderColor: [
          "rgba(255, 99, 132, 1)", // Fires
          "rgba(54, 162, 235, 1)", // Street Lights
          "rgba(255, 206, 86, 1)", // Potholes
          "rgba(75, 192, 192, 1)", // Floods
          "rgba(153, 102, 255, 1)", // Others
          "rgba(255, 159, 64, 1)", // Road Accident
        ],
        borderWidth: 1,
      },
    ],
  };

  return (
    <div className="w-screen flex-grow h-[400px] mt-8 ml-8">
      <div className="font-bold text-md text-main">
        Distribution of Reports by Category
      </div>

      {/* Dropdown for Date Filter */}
      <div className="mb-4">
        <label htmlFor="dateFilter" className="mr-2 font-semibold text-sm">
          Select Date Filter:{" "}
        </label>
        <select
          id="dateFilter"
          onChange={(e) => setDateFilter(e.target.value)}
          value={dateFilter}
          className="p-1 border rounded-md text-xs border-main"
        >
          <option value="today">Today</option>
          <option value="week">This Week</option>
          <option value="month">This Month</option>
          <option value="year">This Year</option>
          <option value="all">All Time</option>
        </select>
      </div>

      {chartData.labels.length > 0 ? (
        <Pie
          data={chartData}
          options={{
            responsive: true,
            plugins: {
              legend: {
                display: true,
                position: "top",
              },
              tooltip: {
                callbacks: {
                  label: function (context) {
                    const total = context.dataset.data.reduce(
                      (a, b) => a + b,
                      0
                    );
                    const value = context.raw;
                    const percentage = ((value / total) * 100).toFixed(2);
                    return `${context.label}: ${percentage}% (${value} reports)`;
                  },
                },
              },
            },
          }}
        />
      ) : (
        <div className="text-center text-gray-500 mt-8">No data available</div>
      )}
    </div>
  );
};

export default PieChart;
