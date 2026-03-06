import React, { useState, useEffect, useRef, useCallback } from "react";
import ConnectContext from "./Connectcontext";
import Cookies from "js-cookie";

const Api = (props) => {
  const host = "https://ai-fitness-app-joow.onrender.com";

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
  const [aiHistoryCache, setAiHistoryCache] = useState(null);
  // ─────────────────────────────────────────────────────────

  /* =========================
     PERSISTENT AI CHAT STATE
  ========================= */
  const [chatMessages, setChatMessages] = useState([]);
  const [chatIsTyping, setChatIsTyping] = useState(false);
  const [chatIsLoading, setChatIsLoading] = useState(true);
  const [chatIsFirst, setChatIsFirst] = useState(true);
  const chatLoadedRef = useRef(false);
  const streamIntervalRef = useRef(null);

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

  const logout = () => {
    Cookies.remove("access_token");
    setauthdata({ token: null, isAuthenticated: false });
    setHistoryCache(null);
    setUserDetailsCache(null);
    setAiHistoryCache(null);
    
    setChatMessages([]);
    setChatIsTyping(false);
    setChatIsLoading(true);
    setChatIsFirst(true);
    chatLoadedRef.current = false;
    if (streamIntervalRef.current) clearInterval(streamIntervalRef.current);
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

  const updateHistory = async (date, payload) => {
    try {
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
      setHistoryCache(null);
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

  const askAiFirst = useCallback(async (prompt) => {
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

      setAiHistoryCache(null);
      return json;
    } catch (error) {
      return { error };
    }
  }, [authdata.token]);

  const updateAiChat = useCallback(async (prompt) => {
    try {
      const response = await fetch(`${host}/ai/update`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authdata.token}`,
        },
        body: JSON.stringify({ prompt }),
      });

      const json = await response.json();
      setAiHistoryCache(null);
      return json;
    } catch (error) {
      console.error("AI update error:", error);
    }
  }, [authdata.token]);

  const getAiHistory = useCallback(async (forceRefresh = false) => {
    if (aiHistoryCache && !forceRefresh) return aiHistoryCache;
    try {
      const response = await fetch(`${host}/ai/history`, {
        headers: { Authorization: `Bearer ${authdata.token}` },
      });
      const json = await response.json();
      setAiHistoryCache(json);
      return json;
    } catch (error) {
      console.error("AI history error:", error);
    }
  }, [authdata.token, aiHistoryCache]);

  const deleteAiChat = async () => {
    try {
      const response = await fetch(`${host}/ai/delete`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${authdata.token}`,
        },
      });

      setChatMessages([]);
      setChatIsFirst(true);
      chatLoadedRef.current = false;

      return await response.json();
    } catch (error) {
      console.error("AI delete error:", error);
    }
  };

  const getUserDetails = async (forceRefresh = false) => {
    if (userDetailsCache && !forceRefresh) return userDetailsCache;
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
     PERSISTENT CHAT ACTIONS
  ========================= */

  const initChatHistory = useCallback(async () => {
    if (chatLoadedRef.current) return; 
    chatLoadedRef.current = true;
    setChatIsLoading(true);
    try {
      const res = await getAiHistory();
      if (res?.messages?.length) {
        const formatted = res.messages.flatMap((m, i) => [
          { id: `${i}-q`, role: 'user', text: m.question },
          { id: `${i}-a`, role: 'bot', text: m.answer },
        ]);
        setChatMessages(formatted);
        setChatIsFirst(false);
      } else {
        setChatMessages([{
          id: 'welcome',
          role: 'bot',
          text: "Hello! I'm your FitMetrics AI. Ask me anything about nutrition, log your meals, or set daily targets.",
        }]);
      }
    } catch (error) {
      console.error("Failed to fetch chat history:", error);
      setChatMessages([{
        id: 'welcome',
        role: 'bot',
        text: "Hello! I'm your FitMetrics AI. Ask me anything about nutrition, log your meals, or set daily targets.",
      }]);
    } finally {
      setChatIsLoading(false);
    }
  }, [getAiHistory]);

  const streamChatResponse = useCallback((text) => {
    const id = Date.now();
    setChatMessages(p => [...p, { id, role: 'bot', text: '' }]);
    let i = 0;
    
    // Performance fix: process text in chunks to prevent render lag
    const chunkSize = Math.max(4, Math.floor(text.length / 30));

    if (streamIntervalRef.current) clearInterval(streamIntervalRef.current);
    
    streamIntervalRef.current = setInterval(() => {
      i += chunkSize;
      setChatMessages(p =>
        p.map(m => m.id === id ? { ...m, text: text.slice(0, i) } : m)
      );
      
      if (i >= text.length) {
        clearInterval(streamIntervalRef.current);
        streamIntervalRef.current = null;
        // Failsafe to ensure exact text is set at the end
        setChatMessages(p =>
          p.map(m => m.id === id ? { ...m, text } : m)
        );
      }
    }, 16); // ~60fps smooth rendering
  }, []);

  const sendChatMessage = useCallback(async (text, selectedOption, selectedDate) => {
    if (!text.trim()) return;

    let finalText = text;
    if (selectedOption && selectedDate) {
      if (selectedOption === 'today')
        finalText = `[SAVE_DIET:${selectedDate}] Calculate my diet for today.\n\n${text}`;
      else if (selectedOption === 'yesterday')
        finalText = `[SAVE_DIET:${selectedDate}] Calculate my diet for yesterday.\n\n${text}`;
      else if (selectedOption === 'date')
        finalText = `[SAVE_DIET:${selectedDate}] Calculate my diet for ${selectedDate}.\n\n${text}`;
    }

    setChatMessages(p => [...p, { id: Date.now(), role: 'user', text }]);
    setChatIsTyping(true);

    try {
      const res = chatIsFirst
        ? await askAiFirst(finalText)
        : await updateAiChat(finalText);
      setChatIsFirst(false);
      setChatIsTyping(false);
      streamChatResponse(res.response);
    } catch (err) {
      setChatIsTyping(false);
      setChatMessages(p => [...p, {
        id: Date.now(),
        role: 'bot',
        text: err?.error?.detail || 'Error occurred.',
      }]);
    }
  }, [chatIsFirst, askAiFirst, updateAiChat, streamChatResponse]);

  /* =========================
     CONTEXT PROVIDER
  ========================= */

  return (
    <ConnectContext.Provider
      value={{
        authdata,
        setauthdata,
        loading,
        signup,
        login,
        logout,
        getUserDetails,

        saveHistory,
        getAllHistory,
        getHistoryByDate,
        updateHistory,

        askAi,
        askAiFirst,
        updateAiChat,
        getAiHistory,
        deleteAiChat,

        chatMessages,
        chatIsTyping,
        chatIsLoading,
        initChatHistory,
        sendChatMessage,
      }}
    >
      {props.children}
    </ConnectContext.Provider>
  );
};

export default Api;