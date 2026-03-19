import React from "react";
import { Tabs, Tab, Box } from "@mui/material";

const SwitchTabs = ({ activeTab, setActiveTab }) => {
  return (
    <Box mb={3}>
      <Tabs
        value={activeTab}
        onChange={(e, v) => setActiveTab(v)}
        indicatorColor="primary"
        textColor="primary"
      >
        <Tab label="Temporary Users" value="users" />
        <Tab label="Temporary Vehicles" value="vehicles" />
      </Tabs>
    </Box>
  );
};

export default SwitchTabs;
