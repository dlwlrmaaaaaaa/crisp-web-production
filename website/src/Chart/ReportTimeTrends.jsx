import React, { useEffect, useState } from "react";
import {
  onSnapshot,
  collection,
  getFirestore,
  query,
  where,
} from "firebase/firestore";
import { Line } from "react-chartjs-2";
import { app } from "../Firebase/firebaseConfig";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";

const db = getFirestore(app);

// Register necessary components from Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const ReportTimeTrends = () => {
  const [reports, setReports] = useState([]);
  const [chartData, setChartData] = useState({
    labels: [], // Hour labels (e.g., "0:00", "1:00", ..., "23:00")
    datasets: [], // Datasets for the number of reports created at each hour
  });
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

  // Fetch reports from Firestore with date filtering
  const fetchDocuments = async (filter) => {
    const categories = [
      "fires",
      "street lights",
      "potholes",
      "floods",
      "others",
      "road accident",
    ];

    // Clear previous reports to avoid duplication
    setReports([]);

    const unsubscribeFunctions = categories.map((category) => {
      let q = collection(db, `reports/${category}/reports`);

      if (filter !== "all") {
        const startOfPeriod = getStartOfPeriod(filter);
        if (startOfPeriod) {
          // If filter is applied, fetch reports after the specified date
          q = query(q, where("report_date", ">=", startOfPeriod.toISOString()));
        }
      }

      return onSnapshot(q, (snapshot) => {
        const updateReports = snapshot.docs.map((doc) => ({
          ...doc.data(),
          category,
          id: doc.id, // Track unique document ID
        }));

        setReports((prevReports) => {
          // Avoid duplicate reports by using the document ID
          const newReports = updateReports.filter(
            (newReport) =>
              !prevReports.some((report) => report.id === newReport.id)
          );
          return [...prevReports, ...newReports]; // Add only new reports
        });
      });
    });

    return () => {
      unsubscribeFunctions.forEach((unsubscribe) => unsubscribe());
    };
  };

  useEffect(() => {
    fetchDocuments(dateFilter);
  }, [dateFilter]); // Fetch data whenever the date filter changes

  useEffect(() => {
    if (reports.length > 0) {
      const reportCounts = {
        fires: Array(24).fill(0),
        "street lights": Array(24).fill(0),
        potholes: Array(24).fill(0),
        floods: Array(24).fill(0),
        others: Array(24).fill(0),
        "road accident": Array(24).fill(0),
      };

      // Count the number of reports for each hour of the day, by category
      reports.forEach((report) => {
        const timestamp = new Date(report.report_date); // Assuming report_date is a Firebase Timestamp
        const hour = timestamp.getHours(); // Extract the hour from the report's timestamp
        const category = report.category; // Get the report category

        if (reportCounts[category]) {
          reportCounts[category][hour] += 1; // Increment the count for the hour in that category
        }
      });

      // Prepare data for the chart
      const labels = Array.from({ length: 24 }, (_, index) => `${index}:00`); // ["0:00", "1:00", ..., "23:00"]

      const datasets = Object.keys(reportCounts).map((category) => {
        const color = categoryColors[category] || "rgba(75, 192, 192, 0.4)"; // Default color if no custom color
        return {
          label: category,
          data: reportCounts[category],
          fill: false,
          backgroundColor: color.backgroundColor,
          borderColor: color.borderColor,
          tension: 0.1, // Smooth lines
        };
      });

      setChartData({
        labels: labels, // Hour labels for x-axis
        datasets: datasets, // Datasets for each category
      });
    }
  }, [reports]);

  return (
    <div className="w-4/5 flex-grow h-[400px] mt-8 ml-8">
      <div className="font-bold text-md text-main">
        Report Trends Based on Time of the Day (By Category)
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
        <Line
          data={chartData}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                display: true,
                position: "top",
              },
              tooltip: {
                callbacks: {
                  label: function (context) {
                    return `${context.dataset.label}: ${context.raw} reports`;
                  },
                },
              },
            },
            scales: {
              x: {
                title: {
                  display: true,
                  text: "Time of Day (Hour)",
                },
                grid: {
                  display: true,
                },
              },
              y: {
                title: {
                  display: true,
                  text: "Number of Reports",
                },
                grid: {
                  display: true,
                },
                beginAtZero: true,
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

export default ReportTimeTrends;

// Define category colors for the chart
const categoryColors = {
  fires: {
    backgroundColor: "rgba(255, 99, 132, 0.4)", // Pink
    borderColor: "rgba(255, 99, 132, 1)",
  },
  "street lights": {
    backgroundColor: "rgba(54, 162, 235, 0.4)", // Blue
    borderColor: "rgba(54, 162, 235, 1)",
  },
  potholes: {
    backgroundColor: "rgba(255, 206, 86, 0.4)", // Yellow
    borderColor: "rgba(255, 206, 86, 1)",
  },
  floods: {
    backgroundColor: "rgba(75, 192, 192, 0.4)", // Green
    borderColor: "rgba(75, 192, 192, 1)",
  },
  others: {
    backgroundColor: "rgba(153, 102, 255, 0.4)", // Purple
    borderColor: "rgba(153, 102, 255, 1)",
  },
  "road accident": {
    backgroundColor: "rgba(255, 159, 64, 0.4)", // Orange
    borderColor: "rgba(255, 159, 64, 1)",
  },
};
