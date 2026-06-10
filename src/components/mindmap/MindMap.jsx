/* eslint-disable react-hooks/refs */
/* eslint-disable react-hooks/immutability */
import { useState, useEffect, useRef, useContext } from 'react';
import { UIContext } from '../../context/UIContext';
import { DataContext } from '../../context/DataContext';
import MindMapDetailPanel from './MindMapDetailPanel';
import { fetchAiConnections } from '../../services/aiService';
import { slugifyKey } from '../../services/storageService';

const LEGEND_ITEMS = [
  { color: 'var(--accent-green)', label: 'Ciências' },
  { color: 'var(--accent-purple)', label: 'Humanas' },
  { color: 'var(--accent-blue)', label: 'Exatas' },
  { color: 'var(--accent-pink)', label: 'Linguagens' },
  { color: 'var(--accent-cyan)', label: 'Tecnologia' },
  { color: 'var(--accent-orange)', label: 'Personalizados' },
];

function MindMap() {
  const {
    setActiveTab,
    setSelectedTermKey,
    showToast,
    showCustomConfirm
  } = useContext(UIContext);

  const {
    terms,
    setTerms,
    geminiApiKey
  } = useContext(DataContext);

  // --- 1. React States for UI Render only ---
  const [physicsEnabled, setPhysicsEnabledState] = useState(false);
  const [activeConnSource, setActiveConnSourceState] = useState(null);
  const [selectedNodeId, setSelectedNodeIdState] = useState(null);

  // --- 2. Refs for high-performance physics & drag (to prevent React re-renders at 60fps) ---
  const nodesRef = useRef({}); // Stores real-time x, y, vx, vy, connections, etc.
  const zoomRef = useRef(1); // Zoom scale factor
  const panRef = useRef({ x: 0, y: 0 }); // Viewport pan offset
  
  const draggedNodeIdRef = useRef(null); // ID of currently dragged node
  const dragOffsetRef = useRef({ x: 0, y: 0 }); // Mouse offset relative to node origin
  const isPanningRef = useRef(false); // Flag if viewport pan is active
  const panStartRef = useRef({ x: 0, y: 0 }); // Viewport pan start coordinates
  const lastPinchDistRef = useRef(0); // Multi-touch pinch dist tracker
  
  const animationFrameIdRef = useRef(null); // requestAnimationFrame loop ID
  const physicsEnabledRef = useRef(false); // Real-time flag for physics state
  
  const activeConnSourceRef = useRef(null); // Ref mirror for activeConnSource
  const selectedNodeIdRef = useRef(null); // Ref mirror for selectedNodeId

  const termsRef = useRef(terms);
  useEffect(() => {
    termsRef.current = terms;
  }, [terms]);

  // DOM Elements Refs
  const svgRef = useRef(null);
  const viewportGroupRef = useRef(null);
  const linksGroupRef = useRef(null);
  const nodesGroupRef = useRef(null);

  // Wrapper functions to keep states and refs in sync
  const setActiveConnSource = (val) => {
    setActiveConnSourceState(val);
    activeConnSourceRef.current = val;
  };

  const setSelectedNodeId = (val) => {
    setSelectedNodeIdState(val);
    selectedNodeIdRef.current = val;
  };

  // Commit current local positions back to the global state
  const saveCoordinatesToContext = () => {
    const updatedTerms = { ...termsRef.current };
    let changed = false;
    Object.keys(nodesRef.current).forEach(key => {
      const localNode = nodesRef.current[key];
      const stateNode = updatedTerms[key];
      if (stateNode && (stateNode.x !== localNode.x || stateNode.y !== localNode.y)) {
        updatedTerms[key] = {
          ...stateNode,
          x: localNode.x,
          y: localNode.y
        };
        changed = true;
      }
    });
    if (changed) {
      setTerms(updatedTerms);
    }
  };

  // --- 4. Synchronization Effect ---
  // Synchronizes changes from terms (additions, deletions, updates) into nodesRef.current
  useEffect(() => {
    const keys = Object.keys(terms);
    keys.forEach(key => {
      const stateNode = terms[key];
      if (!nodesRef.current[key]) {
        // Initialize node in simulation ref
        nodesRef.current[key] = {
          x: stateNode.x !== undefined ? stateNode.x : Math.random() * 400 + 100,
          y: stateNode.y !== undefined ? stateNode.y : Math.random() * 250 + 80,
          vx: 0,
          vy: 0,
          term: stateNode.term,
          category: stateNode.category,
          connections: stateNode.connections || []
        };
      } else {
        // Sync attributes from context state
        nodesRef.current[key].term = stateNode.term;
        nodesRef.current[key].category = stateNode.category;
        nodesRef.current[key].connections = stateNode.connections || [];
        if (stateNode.x !== undefined) nodesRef.current[key].x = stateNode.x;
        if (stateNode.y !== undefined) nodesRef.current[key].y = stateNode.y;
      }
    });

    // Remove deleted nodes from simulation
    Object.keys(nodesRef.current).forEach(key => {
      if (!terms[key]) {
        delete nodesRef.current[key];
      }
    });

    // Redraw nodes and links in the DOM
    updateAllNodePositions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [terms]);

  // Cleanup loop on unmount
  useEffect(() => {
    // Check if initial coordinates need arrangement
    arrangeCoordinatesIfEmpty();

    return () => {
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
      // Save coordinate adjustments on unmount
      saveCoordinatesToContext();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- 5. Realtime DOM Update Functions (Bypass Virtual DOM diffing) ---
  const updateAllNodePositions = () => {
    const keys = Object.keys(nodesRef.current);
    keys.forEach(key => {
      const node = nodesRef.current[key];
      const g = nodesGroupRef.current?.querySelector(`g[data-id="${key}"]`);
      if (g) {
        g.setAttribute("transform", `translate(${node.x}, ${node.y})`);
      }
    });
    renderLinksRealtime();
  };

  const renderLinksRealtime = () => {
    if (!linksGroupRef.current) return;
    const currentNodes = nodesRef.current;
    const keys = Object.keys(currentNodes);
    const activeSrc = activeConnSourceRef.current;
    const selectedNode = selectedNodeIdRef.current;
    const drawnPairs = new Set();

    keys.forEach(sourceKey => {
      const sourceNode = currentNodes[sourceKey];
      if (!sourceNode || !Array.isArray(sourceNode.connections)) return;
      sourceNode.connections.forEach(destKey => {
        const destNode = currentNodes[destKey];
        if (destNode) {
          const pairId = [sourceKey, destKey].sort().join("-");
          if (!drawnPairs.has(pairId)) {
            drawnPairs.add(pairId);
            const line = linksGroupRef.current.querySelector(`line[data-link-id="${pairId}"]`);
            if (line) {
              line.setAttribute("x1", sourceNode.x);
              line.setAttribute("y1", sourceNode.y);
              line.setAttribute("x2", destNode.x);
              line.setAttribute("y2", destNode.y);
              
              const isHighlighted = (activeSrc === sourceKey || activeSrc === destKey || selectedNode === sourceKey || selectedNode === destKey);
              line.setAttribute("class", `mindmap-link ${isHighlighted ? 'highlighted' : ''}`);
            }
          }
        }
      });
    });
  };

  const applyViewportTransform = () => {
    if (viewportGroupRef.current) {
      viewportGroupRef.current.setAttribute(
        "transform",
        `translate(${panRef.current.x}, ${panRef.current.y}) scale(${zoomRef.current})`
      );
    }
  };

  // --- 6. Physics Calculations (Calculated inside animation frame) ---
  const tickPhysics = () => {
    const currentNodes = nodesRef.current;
    const keys = Object.keys(currentNodes);
    const cx = 400;
    const cy = 250;
    
    const forces = {};
    keys.forEach(key => {
      forces[key] = { fx: 0, fy: 0 };
    });

    // 1. Repel nodes
    for (let i = 0; i < keys.length; i++) {
      for (let j = i + 1; j < keys.length; j++) {
        const keyA = keys[i];
        const keyB = keys[j];
        const nodeA = currentNodes[keyA];
        const nodeB = currentNodes[keyB];
        if (!nodeA || !nodeB) continue;
        
        const dx = nodeB.x - nodeA.x;
        const dy = nodeB.y - nodeA.y;
        const distSq = dx * dx + dy * dy + 0.01;
        const dist = Math.sqrt(distSq);
        
        if (dist < 280) {
          const force = 1600 / distSq;
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          
          forces[keyA].fx -= fx;
          forces[keyA].fy -= fy;
          forces[keyB].fx += fx;
          forces[keyB].fy += fy;
        }
      }
    }

    // 2. Attract connected nodes
    const connectedPairs = new Set();
    keys.forEach(keyA => {
      const nodeA = currentNodes[keyA];
      if (!nodeA || !Array.isArray(nodeA.connections)) return;
      nodeA.connections.forEach(keyB => {
        const nodeB = currentNodes[keyB];
        if (!nodeB) return;
        
        const pairId = [keyA, keyB].sort().join("-");
        if (connectedPairs.has(pairId)) return;
        connectedPairs.add(pairId);
        
        const dx = nodeB.x - nodeA.x;
        const dy = nodeB.y - nodeA.y;
        const dist = Math.sqrt(dx * dx + dy * dy) + 0.01;
        
        const restLength = 130;
        const K_spring = 0.03;
        const displacement = dist - restLength;
        const force = displacement * K_spring;
        
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        
        forces[keyA].fx += fx;
        forces[keyA].fy += fy;
        forces[keyB].fx -= fx;
        forces[keyB].fy -= fy;
      });
    });

    // 3. Central gravity and movement update
    keys.forEach(key => {
      const node = currentNodes[key];
      if (!node) return;
      if (key === draggedNodeIdRef.current) {
        node.vx = 0;
        node.vy = 0;
        return;
      }
      
      const dx = cx - node.x;
      const dy = cy - node.y;
      forces[key].fx += dx * 0.01;
      forces[key].fy += dy * 0.01;

      node.vx = (node.vx + forces[key].fx) * 0.8;
      node.vy = (node.vy + forces[key].fy) * 0.8;

      node.x += node.vx;
      node.y += node.vy;

      // Boundary constraints
      node.x = Math.max(30, Math.min(1000, node.x));
      node.y = Math.max(30, Math.min(600, node.y));
    });
  };

  const startPhysics = () => {
    if (animationFrameIdRef.current) {
      cancelAnimationFrame(animationFrameIdRef.current);
      animationFrameIdRef.current = null;
    }
    
    Object.keys(nodesRef.current).forEach(key => {
      const node = nodesRef.current[key];
      if (node.vx === undefined) node.vx = 0;
      if (node.vy === undefined) node.vy = 0;
    });

    physicsEnabledRef.current = true;
    setPhysicsEnabledState(true);

    const physicsLoop = () => {
      if (!physicsEnabledRef.current) return;
      tickPhysics();
      updateAllNodePositions();
      animationFrameIdRef.current = requestAnimationFrame(physicsLoop);
    };
    animationFrameIdRef.current = requestAnimationFrame(physicsLoop);
  };

  const stopPhysics = () => {
    physicsEnabledRef.current = false;
    setPhysicsEnabledState(false);
    if (animationFrameIdRef.current) {
      cancelAnimationFrame(animationFrameIdRef.current);
      animationFrameIdRef.current = null;
    }
    saveCoordinatesToContext();
  };

  const handleTogglePhysics = () => {
    if (physicsEnabledRef.current) {
      stopPhysics();
    } else {
      startPhysics();
    }
  };

  // --- 7. SVG Coordinates Translation Helper ---
  const clientToSvg = (clientX, clientY) => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const rect = svgRef.current.getBoundingClientRect();
    return {
      x: (clientX - rect.left - panRef.current.x) / zoomRef.current,
      y: (clientY - rect.top - panRef.current.y) / zoomRef.current
    };
  };

  // --- 8. Manual Arrangements ---
  const arrangeCoordinatesIfEmpty = () => {
    const keys = Object.keys(terms);
    let changed = false;
    keys.forEach((key, idx) => {
      const node = terms[key];
      if (node.x === undefined || node.y === undefined) {
        const angle = idx * 0.75;
        const radius = 50 + idx * 20;
        const newX = 400 + Math.cos(angle) * radius;
        const newY = 250 + Math.sin(angle) * radius;
        
        if (!nodesRef.current[key]) {
          nodesRef.current[key] = { vx: 0, vy: 0 };
        }
        nodesRef.current[key].x = newX;
        nodesRef.current[key].y = newY;
        changed = true;
      }
    });

    if (changed) {
      updateAllNodePositions();
      saveCoordinatesToContext();
    }
  };

  const arrangeNodesCircle = () => {
    const keys = Object.keys(terms);
    const count = keys.length;
    if (count === 0) return;
    const cx = 400;
    const cy = 250;
    const radius = Math.min(cx - 100, cy - 80, count * 15 + 80);

    keys.forEach((key, idx) => {
      const angle = (idx / count) * 2 * Math.PI;
      const newX = cx + Math.cos(angle) * radius;
      const newY = cy + Math.sin(angle) * radius;

      if (!nodesRef.current[key]) {
        nodesRef.current[key] = { vx: 0, vy: 0 };
      }
      nodesRef.current[key].x = newX;
      nodesRef.current[key].y = newY;
    });

    updateAllNodePositions();
    saveCoordinatesToContext();
    showToast("Mapa mental reorganizado em círculo.");
  };

  const handleClearLinks = async () => {
    const confirmed = await showCustomConfirm(
      <><i className="fa-solid fa-link-slash" style={{ color: 'var(--accent-pink)' }} /> Limpar Conexões</>,
      "Deseja apagar todas as conexões entre termos? Isso não apagará os termos em si.",
      true
    );
    if (confirmed) {
      const updatedTerms = { ...terms };
      Object.keys(updatedTerms).forEach((key) => {
        updatedTerms[key] = {
          ...updatedTerms[key],
          connections: []
        };
      });
      setTerms(updatedTerms);
      showToast("Conexões limpas.");
    }
  };

  // --- 9. Interactive Panning & Zoom Controls ---
  const adjustZoom = (factor) => {
    zoomRef.current = Math.max(0.3, Math.min(3, zoomRef.current * factor));
    applyViewportTransform();
  };

  const resetZoomPan = () => {
    zoomRef.current = 1;
    panRef.current = { x: 0, y: 0 };
    applyViewportTransform();
  };

  const handleWheel = (e) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    adjustZoom(zoomFactor);
  };

  // --- 10. Pointer Interactions (Pan, Drag, Touch Multi-touch) ---
  const handlePointerDown = (e) => {
    const nodeGroup = e.target.closest(".mindmap-node");
    if (nodeGroup) {
      // Drag node start
      const key = nodeGroup.getAttribute("data-id");
      if (key && nodesRef.current[key]) {
        e.stopPropagation();
        draggedNodeIdRef.current = key;
        const svgCoords = clientToSvg(e.clientX, e.clientY);
        dragOffsetRef.current = {
          x: svgCoords.x - nodesRef.current[key].x,
          y: svgCoords.y - nodesRef.current[key].y
        };
        nodesRef.current[key].vx = 0;
        nodesRef.current[key].vy = 0;
      }
    } else if (e.target === svgRef.current || e.target.id === "viewport-group" || e.target.tagName === "svg" || e.target.closest("#viewport-group")) {
      // Panning viewport start
      if (e.button === 0 || e.pointerType === 'touch') {
        isPanningRef.current = true;
        panStartRef.current = {
          x: e.clientX - panRef.current.x,
          y: e.clientY - panRef.current.y
        };
        if (svgRef.current) {
          svgRef.current.style.cursor = "grabbing";
        }
      }
    }
  };

  const handlePointerMove = (e) => {
    if (draggedNodeIdRef.current) {
      // Update dragged node position directly in the DOM
      const key = draggedNodeIdRef.current;
      const node = nodesRef.current[key];
      if (node) {
        const svgCoords = clientToSvg(e.clientX, e.clientY);
        node.x = Math.max(20, Math.min(1500, svgCoords.x - dragOffsetRef.current.x));
        node.y = Math.max(20, Math.min(1000, svgCoords.y - dragOffsetRef.current.y));
        
        const g = nodesGroupRef.current?.querySelector(`g[data-id="${key}"]`);
        if (g) {
          g.setAttribute("transform", `translate(${node.x}, ${node.y})`);
        }
        renderLinksRealtime();
      }
    } else if (isPanningRef.current) {
      // Update viewport transformation directly in the DOM
      panRef.current = {
        x: e.clientX - panStartRef.current.x,
        y: e.clientY - panStartRef.current.y
      };
      applyViewportTransform();
    }
  };

  const handlePointerUp = () => {
    if (draggedNodeIdRef.current) {
      draggedNodeIdRef.current = null;
      saveCoordinatesToContext();
    }
    if (isPanningRef.current) {
      isPanningRef.current = false;
      if (svgRef.current) {
        svgRef.current.style.cursor = "grab";
      }
    }
  };

  // --- Mobile Multi-Touch Event Handlers ---
  const handleTouchStart = (e) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      lastPinchDistRef.current = Math.sqrt(dx * dx + dy * dy);
    }
  };

  const handleTouchMove = (e) => {
    if (e.touches.length === 2 && lastPinchDistRef.current > 0) {
      e.preventDefault();
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const newDist = Math.sqrt(dx * dx + dy * dy);
      const factor = newDist / lastPinchDistRef.current;
      adjustZoom(factor);
      lastPinchDistRef.current = newDist;
    }
  };

  const handleTouchEnd = () => {
    lastPinchDistRef.current = 0;
  };

  // --- 11. Node Click Connection / Detail Logic ---
  const handleNodeClick = (e, clickedKey) => {
    e.stopPropagation();
    if (activeConnSource !== null) {
      if (activeConnSource === clickedKey) {
        setActiveConnSource(null);
      } else {
        const sourceNode = terms[activeConnSource];
        const destNode = terms[clickedKey];
        if (!sourceNode || !destNode) return;
        
        const connsSource = sourceNode.connections || [];
        const connsDest = destNode.connections || [];
        let updated;

        if (connsSource.includes(clickedKey)) {
          // Break connection
          updated = {
            ...terms,
            [activeConnSource]: {
              ...sourceNode,
              connections: connsSource.filter(c => c !== clickedKey)
            },
            [clickedKey]: {
              ...destNode,
              connections: connsDest.filter(c => c !== activeConnSource)
            }
          };
          showToast("Conexão removida.");
        } else {
          // Create connection
          updated = {
            ...terms,
            [activeConnSource]: {
              ...sourceNode,
              connections: [...connsSource, clickedKey]
            },
            [clickedKey]: {
              ...destNode,
              connections: [...connsDest, activeConnSource]
            }
          };
          showToast("Conexão criada!");
        }
        setTerms(updated);
        setActiveConnSource(null);
      }
    } else {
      setSelectedNodeId(clickedKey);
      // Highlight lines immediately
      setTimeout(() => renderLinksRealtime(), 0);
    }
  };

  const handleNodeDoubleClick = (key) => {
    saveCoordinatesToContext();
    setActiveTab("dashboard");
    setSelectedTermKey(key);
  };

  // --- 12. AI Connection Suggester ---
  const suggestConnectionsWithAi = async () => {
    if (!geminiApiKey || !geminiApiKey.trim()) {
      showToast("Por favor, configure uma chave da API do Gemini nas configurações.", true);
      return;
    }

    const keys = Object.keys(terms);
    if (keys.length < 2) {
      showToast("Adicione pelo menos 2 termos para gerar conexões.", true);
      return;
    }

    showToast("IA analisando termos e sugerindo conexões...");

    try {
      const connections = await fetchAiConnections(keys, terms, geminiApiKey);
      if (connections && connections.length > 0) {
        let addedCount = 0;
        const updatedTerms = { ...terms };

        connections.forEach(([rawKeyA, rawKeyB]) => {
          const keyA = slugifyKey(rawKeyA);
          const keyB = slugifyKey(rawKeyB);
          const nodeA = updatedTerms[keyA];
          const nodeB = updatedTerms[keyB];
          if (keyA && keyB && nodeA && nodeB && keyA !== keyB) {
            const connsA = nodeA.connections || [];
            const connsB = nodeB.connections || [];
            let changedA = false;
            let changedB = false;
            let nextConnsA = connsA;
            let nextConnsB = connsB;

            if (!connsA.includes(keyB)) {
              nextConnsA = [...connsA, keyB];
              addedCount++;
              changedA = true;
            }
            if (!connsB.includes(keyA)) {
              nextConnsB = [...connsB, keyA];
              changedB = true;
            }

            if (changedA) {
              updatedTerms[keyA] = {
                ...updatedTerms[keyA],
                connections: nextConnsA
              };
            }
            if (changedB) {
              updatedTerms[keyB] = {
                ...updatedTerms[keyB],
                connections: nextConnsB
              };
            }
          }
        });

        setTerms(updatedTerms);
        showToast(`IA gerou ${addedCount} nova(s) conexão(ões) de estudos!`);
      } else {
        showToast("A IA não encontrou novas conexões óbvias entre esses termos.");
      }
    } catch (err) {
      console.error("AI connection suggest error:", err);
      showToast("Erro ao conectar termos por IA: " + err.message, true);
    }
  };

  // --- 13. Declarative Links List Builder for React reconciliation ---
  const linksList = [];
  const drawnPairs = new Set();
  const nodeKeys = Object.keys(terms);

  nodeKeys.forEach(sourceKey => {
    const sourceNode = nodesRef.current[sourceKey] || terms[sourceKey];
    if (sourceNode && sourceNode.connections) {
      sourceNode.connections.forEach(destKey => {
        const destNode = nodesRef.current[destKey] || terms[destKey];
        if (destNode) {
          const pairId = [sourceKey, destKey].sort().join("-");
          if (!drawnPairs.has(pairId)) {
            drawnPairs.add(pairId);
            const isHighlighted = (activeConnSource === sourceKey || activeConnSource === destKey || selectedNodeId === sourceKey || selectedNodeId === destKey);
            linksList.push(
              <line
                key={pairId}
                data-link-id={pairId}
                x1={sourceNode.x}
                y1={sourceNode.y}
                x2={destNode.x}
                y2={destNode.y}
                className={`mindmap-link ${isHighlighted ? 'highlighted' : ''}`}
              />
            );
          }
        }
      });
    }
  });

  return (
    <section className="tab-content active" id="tab-mindmap">
      <div className="mindmap-wrapper">
        <div className="mindmap-hint">
          <i className="fa-solid fa-circle-info" aria-hidden="true"></i>{' '}
          <strong>Dica:</strong> Arraste os cartões para organizar. Clique em um e depois em outro para conectar. Use a rodinha ou botões para Zoom.
        </div>

        <div className="mindmap-legend">
          {LEGEND_ITEMS.map((item) => (
            <div key={item.label} className="legend-item">
              <span className="legend-color" style={{ background: item.color }}></span> {item.label}
            </div>
          ))}
        </div>

        {/* Unified pointer events for desktop / touch screen inputs */}
        <svg 
          className="mindmap-svg" 
          id="mindmap-svg" 
          role="img" 
          aria-label="Mapa de conexões interativo entre termos de estudo"
          ref={svgRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchEnd}
          onWheel={handleWheel}
          onClick={() => {
            // Clicking empty canvas background clears connection source
            setActiveConnSource(null);
            setSelectedNodeId(null);
            setTimeout(() => renderLinksRealtime(), 0);
          }}
          style={{ touchAction: 'none', cursor: 'grab' }}
        >
          <g id="viewport-group" ref={viewportGroupRef} transform={`translate(${panRef.current.x}, ${panRef.current.y}) scale(${zoomRef.current})`}>
            {/* Draw connection lines */}
            <g id="links-group" ref={linksGroupRef}>{linksList}</g>
            
            {/* Draw nodes */}
            <g id="nodes-group" ref={nodesGroupRef}>
              {nodeKeys.map(key => {
                const node = nodesRef.current[key] || terms[key];
                let gClass = "mindmap-node " + (node.category || "custom");
                if (key === selectedNodeId) gClass += " selected";
                if (key === activeConnSource) gClass += " active-source";

                let displayName = node.term;
                if (displayName.includes("(")) {
                  displayName = displayName.split("(")[0].trim();
                }
                if (displayName.length > 15) {
                  displayName = displayName.substring(0, 13) + "..";
                }

                const padX = 20;
                const textWidth = Math.max(70, displayName.length * 7 + 10);
                const rectW = textWidth + padX;
                const rectH = 32;
                const rectX = -rectW / 2;
                const rectY = -rectH / 2;

                return (
                  <g
                    key={key}
                    className={gClass}
                    transform={`translate(${node.x}, ${node.y})`}
                    data-id={key}
                    onClick={(e) => {
                      handleNodeClick(e, key);
                    }}
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      handleNodeDoubleClick(key);
                    }}
                  >
                    <rect x={rectX} y={rectY} width={rectW} height={rectH} />
                    <text dy="4">{displayName}</text>
                  </g>
                );
              })}
            </g>
          </g>
        </svg>

        {/* Floating details panel inside Mindmap tab */}
        <MindMapDetailPanel 
          selectedNodeId={selectedNodeId} 
          onClose={() => {
            setSelectedNodeId(null);
            setTimeout(() => renderLinksRealtime(), 0);
          }}
          onStudy={() => {
            if (selectedNodeId) {
              setSelectedTermKey(selectedNodeId);
              setActiveTab('flashcards');
            }
          }}
        />

        <div className="mindmap-controls">
          <button 
            className={`filter-tab${physicsEnabled ? ' active' : ''}`} 
            id="mm-physics-btn" 
            title="Ativar auto-layout com física de gravidade"
            onClick={handleTogglePhysics}
          >
            <i className="fa-solid fa-wind" aria-hidden="true"></i> {physicsEnabled ? 'Física: Ativa' : 'Física: Desativada'}
          </button>
          <button 
            className="filter-tab" 
            id="mm-ai-suggest-btn" 
            title="Usar IA para sugerir conexões inteligentes entre termos"
            onClick={suggestConnectionsWithAi}
          >
            <i className="fa-solid fa-wand-magic-sparkles" style={{ color: 'var(--accent-cyan)' }}></i> Conectar com IA
          </button>
          <button 
            className="filter-tab" 
            id="mm-reset-btn" 
            title="Redistribuir nós em círculo"
            onClick={arrangeNodesCircle}
          >
            <i className="fa-solid fa-arrows-rotate" aria-hidden="true"></i> Organizar Círculo
          </button>
          <button 
            className="filter-tab" 
            id="mm-clear-links-btn" 
            title="Excluir todas as conexões personalizadas"
            onClick={handleClearLinks}
          >
            <i className="fa-solid fa-link-slash" aria-hidden="true"></i> Limpar Conexões
          </button>

          <span className="control-divider" style={{ color: 'var(--border-color)', margin: '0 0.25rem' }}>|</span>

          <button 
            className="icon-btn zoom-btn" 
            id="mm-zoom-in" 
            title="Aumentar Zoom" 
            style={{ width: '32px', height: '32px', fontSize: '0.9rem' }}
            onClick={() => adjustZoom(1.2)}
          >
            <i className="fa-solid fa-plus" aria-hidden="true"></i>
          </button>
          <button 
            className="icon-btn zoom-btn" 
            id="mm-zoom-out" 
            title="Diminuir Zoom" 
            style={{ width: '32px', height: '32px', fontSize: '0.9rem' }}
            onClick={() => adjustZoom(0.8)}
          >
            <i className="fa-solid fa-minus" aria-hidden="true"></i>
          </button>
          <button 
            className="icon-btn zoom-btn" 
            id="mm-zoom-reset" 
            title="Centralizar Visualização" 
            style={{ width: '32px', height: '32px', fontSize: '0.9rem' }}
            onClick={resetZoomPan}
          >
            <i className="fa-solid fa-expand" aria-hidden="true"></i>
          </button>
        </div>
      </div>
    </section>
  );
}

export default MindMap;
