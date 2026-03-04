import React, { useState, useEffect } from "react";
import ConnectContext from "./Connectcontext";
import Cookies from "js-cookie";

const Api = (props) => {
  const host = "http://127.0.0.1:8000";

  /* =========================
     AUTH STATE
  ========================= */
  const [authdata, setauthdata] = useState({
    token: Cookies.get("access_token") || null,
    isAuthenticated: false,
  });

  const [loading, setLoading] = useState(true);

  // ─── Cache ───────────────────────────────────────────────
  const [historyCache, setHistoryCache] = useState(null);
  const [userDetailsCache, setUserDetailsCache] = useState(null);
  // ─────────────────────────────────────────────────────────

  /* =========================
     LOAD TOKEN ON START
  ========================= */
  useEffect(() => {
    const token = Cookies.get("access_token");
    if (token) {
      setauthdata({
        token,
        isAuthenticated: true,
      });
    }
    setLoading(false);
  }, []);

  /* =========================
     AUTH APIs
  ========================= */

  // ✅ SIGNUP
  const signup = async (formData) => {
    try {
      const response = await fetch(`${host}/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_name: formData.user_name || "User",
          user_email: formData.email,
          password: formData.password,
          weight_kg: Number(formData.weight),
          date_of_birth: formData.dob,
          gender: formData.gender,
        }),
      });

      const json = await response.json();

      if (!response.ok) {
        throw new Error(json.detail || "Signup failed");
      }

      Cookies.set("access_token", json.access_token, { expires: 1 });
      setauthdata({ token: json.access_token, isAuthenticated: true });

      return json;
    } catch (error) {
      console.error("Signup error:", error.message);
      return { error: error.message };
    }
  };

  // ✅ LOGIN
  const login = async (email, password) => {
    try {
      const response = await fetch(`${host}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_email: email,
          password,
        }),
      });

      const json = await response.json();

      if (!response.ok) {
        throw new Error(json.detail || "Login failed");
      }

      Cookies.set("access_token", json.access_token, { expires: 1 });
      setauthdata({ token: json.access_token, isAuthenticated: true });

      return json;
    } catch (error) {
      console.error("Login error:", error.message);
      return { error: error.message };
    }
  };

  // ✅ LOGOUT
  const logout = () => {
    Cookies.remove("access_token");
    setauthdata({ token: null, isAuthenticated: false });
    setHistoryCache(null);
    setUserDetailsCache(null);
  };

  /* =========================
     HISTORY APIs
  ========================= */

  const saveHistory = async (payload) => {
    try {
      const response = await fetch(`${host}/history/save`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authdata.token}`,
        },
        body: JSON.stringify(payload),
      });

      return await response.json();
    } catch (error) {
      console.error("Save history error:", error);
    }
  };

  const getAllHistory = async (forceRefresh = false) => {
    if (historyCache && !forceRefresh) return historyCache;
    try {
      const response = await fetch(`${host}/history/all`, {
        headers: { Authorization: `Bearer ${authdata.token}` },
      });
      const json = await response.json();
      setHistoryCache(json);
      return json;
    } catch (error) {
      console.error("Get all history error:", error);
    }
  };

  const getHistoryByDate = async (date) => {
    try {
      const response = await fetch(`${host}/history/by-date/${date}`, {
        headers: {
          Authorization: `Bearer ${authdata.token}`,
        },
      });

      return await response.json();
    } catch (error) {
      console.error("Get history by date error:", error);
    }
  };

  // ✅ UPDATE HISTORY (New)
  const updateHistory = async (date, payload) => {
    try {
      // payload should match UpdateHistoryRequest: { consumed: {...}, foods: [...] }
      const response = await fetch(`${host}/history/update/${date}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authdata.token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
          const errorJson = await response.json();
          throw new Error(errorJson.detail || "Update failed");
      }

      const json = await response.json();
      setHistoryCache(null); // bust cache so next getAllHistory refetches
      return json;
    } catch (error) {
      console.error("Update history error:", error);
      return { error: error.message };
    }
  };

  /* =========================
     AI (GEMINI) APIs
  ========================= */

  const askAi = async (prompt) => {
    try {
      const response = await fetch(`${host}/ai/ask`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authdata.token}`,
        },
        body: JSON.stringify({ prompt }),
      });

      return await response.json();
    } catch (error) {
      console.error("AI error:", error);
    }
  };

  // =========================
  // AI CHAT APIs
  // =========================

  const askAiFirst = async (prompt) => {
    try {
      const response = await fetch(`${host}/ai/ask`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authdata.token}`,
        },
        body: JSON.stringify({ prompt }),
      });

      const json = await response.json();

      if (!response.ok) {
        throw json;
      }

      return json;
    } catch (error) {
      return { error };
    }
  };

  const updateAiChat = async (prompt) => {
    try {
      const response = await fetch(`${host}/ai/update`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authdata.token}`,
        },
        body: JSON.stringify({ prompt }),
      });

      return await response.json();
    } catch (error) {
      console.error("AI update error:", error);
    }
  };

  const getAiHistory = async () => {
    try {
      const response = await fetch(`${host}/ai/history`, {
        headers: {
          Authorization: `Bearer ${authdata.token}`,
        },
      });

      return await response.json();
    } catch (error) {
      console.error("AI history error:", error);
    }
  };

  const deleteAiChat = async () => {
    try {
      const response = await fetch(`${host}/ai/delete`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${authdata.token}`,
        },
      });

      return await response.json();
    } catch (error) {
      console.error("AI delete error:", error);
    }
  };

  // ✅ GET USER DETAILS (Mocking the response based on your JSON)
  const getUserDetails = async (forceRefresh = false) => {
    if (userDetailsCache && !forceRefresh) return userDetailsCache;
    // In a real scenario, this would hit `${host}/auth/me` or similar.
    const data = {
      "_id": { "$oid": "695a817b181bf8f60a39d026" },
      "user_name": "Yash",
      "user_email": "yash@gmail.com",
      "weight_kg": 46,
      "gender": "Male",
      "targets": {
        "protein_g": 92,
        "calories_kcal": 1650,
        "carbs_g": 217,
        "fats_g": 46,
        "calcium_mg": 1000,
        "iron_mg": 18,
        "zinc_mg": 8,
        "magnesium_mg": 320,
        "potassium_mg": 2600,
        "fiber_g": 23,
        "water_l": 2.5
      }
    };
    setUserDetailsCache(data);
    return data;
  };

  /* =========================
     CONTEXT PROVIDER
  ========================= */

  return (
    <ConnectContext.Provider
      value={{
        // auth
        authdata,
        setauthdata,
        loading,
        signup,
        login,
        logout,
        getUserDetails,

        // history
        saveHistory,
        getAllHistory,
        getHistoryByDate,
        updateHistory, // Exposed new function

        // ai
        askAi,
        askAiFirst,
        updateAiChat,
        getAiHistory,
        deleteAiChat,
      }}
    >
      {props.children}
    </ConnectContext.Provider>
  );
};

export default Api;