"use client";
import React, { useEffect, useState } from "react";
import ApexTree from "apextree";
import { useCurrentUser } from "@/app/hooks/use-current-user";

const OrgChart = ({ data }) => {
  const user = useCurrentUser();
  const [chartsData, setChartsData] = useState([]);
  const [chartsRendered, setChartsRendered] = useState(false);



  useEffect(() => {
    setChartsData(data)
  }, [])

  useEffect(() => {
    console.log(chartsData.length, "chartsData.length")

    if (chartsData.length > 0 && !chartsRendered) {
      chartsData.forEach((graph, index) => {
        const data = { ...graph };
        const options = {
          contentKey: "data",
          width: 1400,
          height: 600,
          nodeWidth: 80,
          nodeHeight: 100,
          fontColor: "#fff",
          borderColor: "#333",
          childrenSpacing: 50,
          siblingSpacing: 20,
          direction: "top",
          enableExpandCollapse: true,
          nodeTemplate: (content) =>
            `<div style='display: flex; flex-direction: column; justify-content: center; align-items: center; height: 100%; width: 100%; '>
              <img style='width: 40px; height: 40px; border-radius: 50%;' src='${content.imageURL}' alt='' />
              <div style="text-align: center; font-weight: 900; font-family: Arial; font-size: 7px; width: 100%;">${content.name}</div>
              <div style="text-align: center; font-weight: 900; font-family: Arial; font-size: 10px; width: 100%; font-color:black;">${content.designation}</div>
            </div>`,
          canvasStyle: "background:transparent",
          enableToolbar: true,
        };
        const treeContainer = document.getElementById(`svg-tree-${index}`);
        if (treeContainer) {
          const tree = new ApexTree(treeContainer, options);
          tree.render(data);
        } else {
          console.error(`Tree container ${index + 1} not found.`);
        }
      });
      setChartsRendered(true);
    }
  }, [chartsData, chartsRendered]);

  return (
    <div className="grid grid-cols-1  gap-4 max-w-1/2 overflow-hidden">
      {chartsData.length && (<>
        {chartsData.map((_, index) => (
          <div
            key={index}
            id={`svg-tree-${index}`}
            className={`col-span-1 p-4 rounded-lg ${index % 3 === 0 ? 'bg-[#dbeafe]' : index % 3 === 1 ? 'bg-[#dcfce7]' : 'bg-[#f3e8ff]'} shadow-lg`}
          >
            {/* Additional content can go here */}
          </div>))}
      </>)}
    </div>

  );
};

export default OrgChart;
