/* ═══════════════════════════════════════════════════════
   NexaRide — Application Engine (Pune, Maharashtra)
   ═══════════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {

    // ─── PUNE LOCATION DATABASE ───
    const PUNE_LOCATIONS = {
        shivajinagar: { name: 'Shivajinagar, Pune', lat: 18.5308, lng: 73.8475 },
        hinjewadi:    { name: 'Hinjewadi IT Park',  lat: 18.5912, lng: 73.7381 },
        koregaon:     { name: 'Koregaon Park',      lat: 18.5362, lng: 73.8939 },
        deccan:       { name: 'Deccan Gymkhana',     lat: 18.5168, lng: 73.8413 },
        kothrud:      { name: 'Kothrud',             lat: 18.5074, lng: 73.8077 },
        viman:        { name: 'Viman Nagar',         lat: 18.5679, lng: 73.9143 },
        baner:        { name: 'Baner',               lat: 18.5590, lng: 73.7868 },
        swargate:     { name: 'Swargate Bus Stand',  lat: 18.5018, lng: 73.8636 },
        magarpatta:   { name: 'Magarpatta City',     lat: 18.5142, lng: 73.9265 },
        station:      { name: 'Pune Junction Stn',   lat: 18.5285, lng: 73.8743 },
    };

    const RATE_PER_KM = { BIKE: 6, AUTO: 10, SEDAN: 14, SUV: 20, LUXURY: 32, HATCHBACK: 10 };
    const BASE_FARE_MAP = { BIKE: 15, AUTO: 20, SEDAN: 30, SUV: 50, LUXURY: 100, HATCHBACK: 25 };
    const SURGE = 1.2;

    // ─── NAV / PAGE ROUTING ───
    const navLinks = document.querySelectorAll('.nav-link');
    const pages = document.querySelectorAll('.page');
    const pageTitle = document.getElementById('page-title');
    const titleMap = { dashboard: 'Dashboard', rides: 'Ride Operations', drivers: 'Driver Fleet', analytics: 'Analytics', users: 'Users Registry', sql: 'SQL Terminal' };
    let mapInitialized = false;

    navLinks.forEach(link => {
        link.addEventListener('click', e => {
            e.preventDefault();
            const target = link.dataset.page;
            navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            pages.forEach(p => p.classList.remove('active'));
            document.getElementById(`page-${target}`)?.classList.add('active');
            pageTitle.textContent = titleMap[target] || '';
            if (target === 'rides') {
                if (!mapInitialized) initMap();
                else setTimeout(() => map.invalidateSize(), 100);
            }
            if (target === 'analytics' && !chartsInit.analytics) initAnalyticsCharts();
            if (target === 'drivers') {
                if (!chartsInit.drivers) renderDriverCards();
                updateDriverCount();
            }
            if (target === 'users') {
                if (!chartsInit.users) renderUsersTable();
                updateUserCount();
            }
        });
    });

    // ─── GLOBAL STATS & KPI TRACKING ───
    let globalStats = {
        totalRides: 14829,
        netRevenue: 284500,
        activeUsers: 3842
    };

    function updateKPI(type, value) {
        if (type === 'rides') globalStats.totalRides += value;
        if (type === 'revenue') globalStats.netRevenue += value;
        
        const ridesEl = document.getElementById('kpi-total-rides');
        const revEl = document.getElementById('kpi-net-revenue');
        
        if (ridesEl) {
            ridesEl.dataset.target = globalStats.totalRides;
            ridesEl.textContent = globalStats.totalRides.toLocaleString();
        }
        if (revEl) {
            revEl.dataset.target = globalStats.netRevenue;
            revEl.textContent = globalStats.netRevenue.toLocaleString();
        }
    }

    // ─── ANIMATED COUNTERS ───
    document.querySelectorAll('.counter').forEach(el => {
        const target = +el.dataset.target;
        const start = performance.now();
        const tick = now => {
            const p = Math.min((now - start) / 1800, 1);
            const current = Math.floor((1 - Math.pow(1 - p, 3)) * target);
            el.textContent = current.toLocaleString();
            if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
    });

    // ─── TOAST & AUDIT SYSTEM ───
    const toastC = document.getElementById('toast-container');
    const auditLog = document.getElementById('db-audit-log');

    function toast(title, msg, type = 'success') {
        const icons = { success: 'fa-circle-check', error: 'fa-circle-xmark', info: 'fa-circle-info', warning: 'fa-triangle-exclamation' };
        const colors = { success: '#22c55e', error: '#ef4444', info: '#f5a623', warning: '#f59e0b' };
        const el = document.createElement('div');
        el.className = 'toast-item';
        el.innerHTML = `<i class="fa-solid ${icons[type]} toast-icon" style="color:${colors[type]}"></i><div><h4>${title}</h4><p>${msg}</p></div>`;
        toastC.appendChild(el);
        setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 300); }, 4000);
    }

    function addAuditLog(subject, message, type = 'info') {
        const time = new Date().toLocaleTimeString('en-GB', { hour12: false });
        const item = document.createElement('div');
        item.className = `audit-item ${type}`;
        item.innerHTML = `
            <span class="audit-time">${time}</span>
            <div class="audit-body">
                <strong>${subject}</strong>
                <p>${message}</p>
            </div>
        `;
        auditLog.prepend(item);
        if (auditLog.children.length > 50) auditLog.lastElementChild.remove();
    }

    // ─── DASHBOARD CHARTS ───
    const chartsInit = { dashboard: false, analytics: false, drivers: false, users: false };

    if (document.getElementById('revenueChart')) {
        new Chart(document.getElementById('revenueChart'), {
            type: 'line',
            data: {
                labels: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
                datasets: [{ label: 'Revenue (₹)', data: [18500,22400,19800,28450,32100,29800,35200,38900,34200,41500,45200,48700], borderColor: '#f5a623', backgroundColor: 'rgba(245,166,35,0.08)', fill: true, tension: 0.4, pointBackgroundColor: '#f5a623', pointBorderColor: '#050505', pointBorderWidth: 2, pointRadius: 4, pointHoverRadius: 7 }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { color: 'rgba(255,200,50,0.04)' }, ticks: { color: '#6b6350', font: { family: 'Outfit' } } }, y: { grid: { color: 'rgba(255,200,50,0.04)' }, ticks: { color: '#6b6350', font: { family: 'Outfit' }, callback: v => '₹'+(v/1000)+'k' } } } }
        });
    }

    const statusData = [{ l:'Completed',v:1128,c:'#22c55e'},{ l:'In Progress',v:312,c:'#fbbf24'},{ l:'Requested',v:180,c:'#f59e0b'},{ l:'Cancelled',v:107,c:'#ef4444'}];
    if (document.getElementById('statusChart')) {
        new Chart(document.getElementById('statusChart'), {
            type: 'doughnut',
            data: { labels: statusData.map(d=>d.l), datasets: [{ data: statusData.map(d=>d.v), backgroundColor: statusData.map(d=>d.c), borderWidth: 0, spacing: 3 }] },
            options: { responsive: true, maintainAspectRatio: false, cutout: '68%', plugins: { legend: { display: false } } }
        });
        const leg = document.getElementById('statusLegend');
        statusData.forEach(d => { leg.innerHTML += `<div class="legend-item"><span class="legend-dot" style="background:${d.c}"></span>${d.l} (${d.v})</div>`; });
    }

    // ─── RECENT RIDES TABLE (PUNE ROUTES) ───
    const ridesData = [
        { id:'#RD-10042', rider:'Amit Deshmukh', driver:'Raj Patil', route:'Shivajinagar → Hinjewadi IT Park', fare:'₹540', pay:'UPI', payIcon:'fa-mobile-screen', status:'COMPLETED' },
        { id:'#RD-10043', rider:'Sneha Kulkarni', driver:'Vikram Joshi', route:'Koregaon Park → Magarpatta', fare:'₹280', pay:'WALLET', payIcon:'fa-wallet', status:'COMPLETED' },
        { id:'#RD-10044', rider:'Priya Sharma', driver:'Anil More', route:'Pune Station → Baner', fare:'₹420', pay:'UPI', payIcon:'fa-mobile-screen', status:'COMPLETED' },
        { id:'#RD-10045', rider:'Rohan Mehta', driver:'Suresh Gaikwad', route:'Deccan Gymkhana → Viman Nagar', fare:'₹350', pay:'CARD', payIcon:'fa-cc-visa', status:'IN_PROGRESS' },
        { id:'#RD-10046', rider:'Kavita Pawar', driver:'Deepak Shinde', route:'Swargate → Kothrud', fare:'—', pay:'—', payIcon:'fa-ban', status:'CANCELLED' },
    ];
    const ridesTbody = document.getElementById('rides-tbody');
    function renderRidesTable() {
        ridesTbody.innerHTML = '';
        ridesData.forEach((r, idx) => {
            const sc = r.status.toLowerCase().replace(' ','_');
            const pb = ['fa-cc-visa','fa-cc-mastercard'].includes(r.payIcon) ? 'fa-brands' : 'fa-solid';
            const cancelBtn = r.status === 'REQUESTED' ? `<button class="btn-cancel" onclick="window.cancelRide(${idx})"><i class="fa-solid fa-xmark"></i></button>` : '';
            ridesTbody.innerHTML += `<tr><td style="font-weight:600;color:#f5a623">${r.id}</td><td>${r.rider}</td><td>${r.driver}</td><td style="font-size:0.85rem;color:#a89f8a">${r.route}</td><td>${r.fare}</td><td><i class="${pb} ${r.payIcon}" style="margin-right:0.4rem;color:#6b6350"></i>${r.pay}</td><td style="display:flex;align-items:center;gap:0.5rem"><span class="status-pill ${sc}">${r.status}</span>${cancelBtn}</td></tr>`;
        });
    }

    window.cancelRide = (idx) => {
        const ride = ridesData[idx];
        if (ride.status === 'REQUESTED') {
            ride.status = 'CANCELLED';
            toast('Ride Cancelled', 'Trigger trg_log_cancellation fired.', 'warning');
            addAuditLog('CANCEL_LOG', `trg_log_cancellation: Ride ${ride.id} marked as CANCELLED by system.`, 'error');
            updateKPI('rides', -1);
            renderRidesTable();
        }
    };
    renderRidesTable();

    // ═══════════════════════════════════════
    // ─── LEAFLET MAP (PUNE) ───
    // ═══════════════════════════════════════
    let map, pickupMarker, dropoffMarker, routeLine, driverMarker, driverStartMarker, trackingInterval;

    function initMap() {
        map = L.map('ride-map', { zoomControl: true }).setView([18.5204, 73.8567], 12);
        
        // Use Google Maps Hybrid (Satellite + Roads/Labels) to simulate premium Google Maps features
        L.tileLayer('https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', { 
            maxZoom: 20,
            attribution: '© Google Maps'
        }).addTo(map);

        // Add all location markers as small circles
        Object.entries(PUNE_LOCATIONS).forEach(([key, loc]) => {
            L.circleMarker([loc.lat, loc.lng], { radius: 5, fillColor: '#f5a623', color: '#050505', weight: 1, fillOpacity: 0.8 })
                .bindTooltip(loc.name, { permanent: false, direction: 'top', className: 'map-tooltip' })
                .addTo(map);
        });

        updateMapRoute();
        mapInitialized = true;

        // Fix tile rendering when map container was hidden
        setTimeout(() => map.invalidateSize(), 300);
    }

    function getPickupKey() { return document.getElementById('pickup-input').value; }
    function getDropoffKey() { return document.getElementById('dropoff-input').value; }

    function haversineKm(lat1, lng1, lat2, lng2) {
        const R = 6371;
        const dLat = (lat2-lat1)*Math.PI/180;
        const dLng = (lng2-lng1)*Math.PI/180;
        const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2;
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    }

    function updateMapRoute() {
        if (!map) return;
        const pKey = getPickupKey(), dKey = getDropoffKey();
        const pLoc = PUNE_LOCATIONS[pKey], dLoc = PUNE_LOCATIONS[dKey];
        if (!pLoc || !dLoc) return;

        // Remove old markers/lines
        if (pickupMarker) map.removeLayer(pickupMarker);
        if (dropoffMarker) map.removeLayer(dropoffMarker);
        if (routeLine) map.removeLayer(routeLine);
        if (driverMarker) map.removeLayer(driverMarker);
        if (driverStartMarker) map.removeLayer(driverStartMarker);
        clearInterval(trackingInterval);
        hideTrackingOverlay();

        // Custom icons
        const greenIcon = L.divIcon({ html: '<i class="fa-solid fa-circle-dot" style="color:#22c55e;font-size:20px;filter:drop-shadow(0 0 6px #22c55e)"></i>', className: '', iconSize: [20, 20], iconAnchor: [10, 10] });
        const redIcon = L.divIcon({ html: '<i class="fa-solid fa-location-dot" style="color:#f5a623;font-size:24px;filter:drop-shadow(0 0 6px #f5a623)"></i>', className: '', iconSize: [24, 24], iconAnchor: [12, 24] });

        pickupMarker = L.marker([pLoc.lat, pLoc.lng], { icon: greenIcon }).addTo(map).bindPopup(`<b>Pickup:</b> ${pLoc.name}`);
        dropoffMarker = L.marker([dLoc.lat, dLoc.lng], { icon: redIcon }).addTo(map).bindPopup(`<b>Drop-off:</b> ${dLoc.name}`);

        // Fetch Real Road Route from OSRM Based on Vehicle Profile
        const activeVehicle = document.querySelector('.v-option.active');
        const vType = activeVehicle ? activeVehicle.dataset.type : 'SEDAN';
        const profile = vType === 'BIKE' ? 'bike' : 'driving'; // changes realistic routing rules
        
        const osrmUrl = `https://router.project-osrm.org/route/v1/${profile}/${pLoc.lng},${pLoc.lat};${dLoc.lng},${dLoc.lat}?overview=full&geometries=geojson`;

        // Clear existing overlays
        if (routeLine) map.removeLayer(routeLine);
        if (window.trafficLayers) {
            window.trafficLayers.forEach(l => map.removeLayer(l));
        }
        window.trafficLayers = [];

        fetch(osrmUrl)
            .then(res => res.json())
            .then(data => {
                if (data.routes && data.routes.length > 0) {
                    const route = data.routes[0];
                    const coords = route.geometry.coordinates.map(c => [c[1], c[0]]); // Map LngLat (GeoJSON) to LatLng (Leaflet)
                    
                    // Main Base Route (Blue / Clear Traffic)
                    routeLine = L.polyline(coords, { color: '#3b82f6', weight: 6, opacity: 0.9, lineJoin: 'round' }).addTo(map);

                    // Generate Simulated Live Traffic Visually (Red = Heavy, Yellow = Moderate)
                    for (let i = 0; i < coords.length - 1; i++) {
                        const randChance = Math.random();
                        if (randChance > 0.75) { // 25% of the route has traffic
                            const trafColor = randChance > 0.93 ? '#ef4444' : '#f59e0b';
                            // Slightly thicker line segment to ensure visibility
                            const seg = L.polyline([coords[i], coords[i+1]], { color: trafColor, weight: 6, opacity: 1, lineJoin: 'round' }).addTo(map);
                            window.trafficLayers.push(seg);
                        }
                    }

                    map.fitBounds(routeLine.getBounds(), { padding: [50, 50] });
                    const realDistKm = route.distance / 1000;
                    updateFare(realDistKm);
                }
            })
            .catch(err => {
                // Fallback to straight line if API fails
                routeLine = L.polyline([[pLoc.lat, pLoc.lng], [dLoc.lat, dLoc.lng]], {
                    color: '#f5a623', weight: 4, opacity: 0.8, dashArray: '10 8'
                }).addTo(map);
                map.fitBounds(routeLine.getBounds(), { padding: [50, 50] });
                const distKm = haversineKm(pLoc.lat, pLoc.lng, dLoc.lat, dLoc.lng) * 1.3;
                updateFare(distKm);
            });
    }

    function updateFare(distKm) {
        const activeVehicle = document.querySelector('.v-option.active');
        const type = activeVehicle ? activeVehicle.dataset.type : 'SEDAN';
        const rate = RATE_PER_KM[type] || 14;
        const base = BASE_FARE_MAP[type] || 30;
        const distCost = distKm * rate;
        const total = (base + distCost) * SURGE;

        document.getElementById('fare-base').textContent = `₹${base.toFixed(2)}`;
        document.getElementById('fare-dist').textContent = `${distKm.toFixed(1)} km × ₹${rate}/km = ₹${distCost.toFixed(2)}`;
        document.getElementById('fare-surge').textContent = `×${SURGE}`;
        document.getElementById('fare-total').textContent = `₹${total.toFixed(2)}`;
    }

    // Location change handlers
    document.getElementById('pickup-input').addEventListener('change', updateMapRoute);
    document.getElementById('dropoff-input').addEventListener('change', updateMapRoute);

    // ─── VEHICLE SELECTION ───
    document.querySelectorAll('.v-option').forEach(opt => {
        opt.addEventListener('click', () => {
            document.querySelectorAll('.v-option').forEach(o => o.classList.remove('active'));
            opt.classList.add('active');
            updateMapRoute(); // recalculate fare
        });
    });

    // ─── PAYMENT SELECTION ───
    document.querySelectorAll('.pay-option').forEach(opt => {
        opt.addEventListener('click', () => {
            document.querySelectorAll('.pay-option').forEach(o => o.classList.remove('active'));
            opt.classList.add('active');
        });
    });

    // ─── DISPATCH RIDE & TRACKING SIMULATION ───
    function showTrackingOverlay(etaMin, driver) {
        let overlay = document.getElementById('tracking-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'tracking-overlay';
            overlay.className = 'glass-card tracking-overlay';
            document.querySelector('.map-row').appendChild(overlay);
        }
        const initial = driver ? driver.name.charAt(0) : 'D';
        const dName = driver ? driver.name : 'Raj Patil';
        const dMeta = driver ? `${driver.vehicle} • ${driver.plate} • ★ ${driver.rating}` : 'Maruti Ciaz • MH-12-AB-1234 • ★ 4.9';
        
        overlay.innerHTML = `
            <div class="t-top">
                <img src="https://ui-avatars.com/api/?name=${initial}&background=d97706&color=fff&bold=true" alt="driver">
                <div>
                    <h4>${dName} is arriving</h4>
                    <p>${dMeta}</p>
                </div>
            </div>
            <div class="t-eta"><span class="pulse-dot"></span> Arriving in <strong id="eta-mins">${etaMin}</strong> mins <br> <small id="eta-dist">Calculating distance...</small></div>
        `;
        overlay.style.display = 'block';
    }

    function hideTrackingOverlay() {
        const overlay = document.getElementById('tracking-overlay');
        if (overlay) overlay.style.display = 'none';
    }

    function simulateDriverTracking(pLoc, driver) {
        // Pick a random driver start location offset from pickup
        const latOffset = (Math.random() - 0.5) * 0.05;
        const lngOffset = (Math.random() - 0.5) * 0.05;
        const dStartLat = pLoc.lat + latOffset;
        const dStartLng = pLoc.lng + lngOffset;

        const carIcon = L.divIcon({ html: '<i class="fa-solid fa-car-side fa-flip-horizontal" style="color:#d97706;font-size:26px;filter:drop-shadow(0 0 8px rgba(217,119,6,0.6));background:#000;border-radius:50%;padding:4px"></i>', className: '', iconSize: [34, 34], iconAnchor: [17, 17] });
        
        driverMarker = L.marker([dStartLat, dStartLng], { icon: carIcon }).addTo(map).bindPopup('Driver Location').openPopup();

        const totalDist = haversineKm(dStartLat, dStartLng, pLoc.lat, pLoc.lng) * 1.5; // road factor
        const totalTimeMin = Math.max(Math.round(totalDist * 3), 2); // Assume ~20km/h avg speed -> ~3 min per km in city
        showTrackingOverlay(totalTimeMin, driver);

        // Move the car marker incrementally
        const frames = 60;
        let frame = 0;
        
        // Zoom map to fit both driver and pickup
        const bounds = L.latLngBounds([[dStartLat, dStartLng], [pLoc.lat, pLoc.lng]]);
        map.fitBounds(bounds, { padding: [50, 50] });

        clearInterval(trackingInterval);
        document.getElementById('eta-dist').textContent = `Distance: ${totalDist.toFixed(1)} km away`;

        trackingInterval = setInterval(() => {
            frame++;
            const progress = frame / frames;
            
            // Linear interpolation
            const currLat = dStartLat + (pLoc.lat - dStartLat) * progress;
            const currLng = dStartLng + (pLoc.lng - dStartLng) * progress;
            
            driverMarker.setLatLng([currLat, currLng]);

            // Update ETA Overlay dynamically
            const timeRemaining = Math.max(Math.ceil(totalTimeMin * (1 - progress)), 1);
            const distRemaining = Math.max((totalDist * (1 - progress)), 0.1);
            
            const minEl = document.getElementById('eta-mins');
            if (minEl) minEl.textContent = timeRemaining;
            const distEl = document.getElementById('eta-dist');
            if (distEl) distEl.textContent = `Distance: ${distRemaining.toFixed(1)} km away`;

            if (frame >= frames) {
                clearInterval(trackingInterval);
                toast('Driver Arrived', 'Status updated: Driver has reached the pickup location.', 'success');
                if (distEl) distEl.textContent = 'Driver is at pickup point!';
                setTimeout(() => hideTrackingOverlay(), 4000);
            }
        }, 300); // UI update every 300ms for smooth simulation
    }

    let currentlyAssignedDriver = null;

    document.getElementById('dispatch-ride-btn').addEventListener('click', function() {
        const btn = this;
        const pLoc = PUNE_LOCATIONS[getPickupKey()];
        const pName = pLoc?.name || 'Unknown';
        const dName = PUNE_LOCATIONS[getDropoffKey()]?.name || 'Unknown';
        const fare = document.getElementById('fare-total').textContent;

        const uid = parseInt(document.getElementById('user-input')?.value) || 101;
        const riderName = usersData.find(x => x.id === uid)?.name || 'Guest User';

        // Pick an available driver matching the vehicle type if possible
        const activeVehicle = document.querySelector('.v-option.active');
        const vType = activeVehicle ? activeVehicle.dataset.type : 'SEDAN';
        let availableDrivers = drivers.filter(d => d.status === 'AVAILABLE' && d.type === vType);
        if (availableDrivers.length === 0) availableDrivers = drivers.filter(d => d.status === 'AVAILABLE');
        const assignedDriver = availableDrivers.length ? availableDrivers[Math.floor(Math.random()*availableDrivers.length)] : drivers[0];
        
        currentlyAssignedDriver = assignedDriver;

        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Executing SQL Trigger…';
        btn.style.pointerEvents = 'none';

        setTimeout(() => {
            btn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Dispatch & Execute Trigger';
            btn.style.pointerEvents = '';
            toast('Trigger Fired', `trg_driver_busy_on_accept → Driver assigned (${assignedDriver.name}).`, 'success');
            addAuditLog('TRIGGER_FIRED', `trg_driver_busy_on_accept: Updated driver_id ${assignedDriver.id} status to ON_RIDE.`, 'trigger');

            assignedDriver.status = 'ON_RIDE';
            renderDriverCards();

            // Update and Show Rating Panel
            const rtContent = document.getElementById('rating-active-content');
            const rtPlaceholder = document.getElementById('rating-placeholder');
            const rtName = document.getElementById('rating-driver-name');
            const rtMeta = document.getElementById('rating-driver-meta');
            const rtImg = document.getElementById('rating-driver-img');
            const rtText = document.getElementById('rating-review-text');

            if (rtPlaceholder) rtPlaceholder.style.display = 'none';
            if (rtContent) rtContent.style.display = 'block';
            if (rtName) rtName.textContent = assignedDriver.name;
            if (rtMeta) rtMeta.textContent = `${assignedDriver.vehicle} · ${assignedDriver.plate}`;
            if (rtImg) rtImg.src = `https://ui-avatars.com/api/?name=${assignedDriver.name.replace(' ','+')}&background=7c3aed&color=fff`;
            if (rtText) {
                rtText.value = '';
                rtText.placeholder = `How was your ride with ${assignedDriver.name}?`;
            }

            ridesData.unshift({
                id: '#RD-' + (10047 + Math.floor(Math.random()*900)),
                rider: riderName,
                driver: assignedDriver.name,
                route: pName.split(',')[0] + ' → ' + dName.split(',')[0],
                fare: fare,
                pay: document.querySelector('.pay-option.active')?.dataset.method || 'UPI',
                payIcon: 'fa-bolt',
                status: 'REQUESTED'
            });
            if (ridesData.length > 6) ridesData.pop();
            renderRidesTable();
            updateKPI('rides', 1);

            if (pLoc) simulateDriverTracking(pLoc, assignedDriver);
        }, 1500);
    });

    // ─── PROCESS PAYMENT ───
    document.getElementById('process-payment-btn').addEventListener('click', function() {
        const btn = this;
        const fareStr = document.getElementById('fare-total').textContent;
        const fareVal = parseFloat(fareStr.replace('₹','').replace(',','')) || 0;

        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Validating via trg_process_wallet_payment…';
        setTimeout(() => {
            btn.innerHTML = '<i class="fa-solid fa-lock"></i> Process Secure Payment';
            toast('Payment Processed', 'Trigger trg_process_wallet_payment executed. Status → SUCCESS', 'success');
            addAuditLog('PROC_EXEC', 'sp_process_payment: Deducted ₹' + fareVal.toFixed(2) + ' from wallet.', 'info');
            updateKPI('revenue', Math.floor(fareVal));
        }, 1200);
    });

    // ─── STAR RATING ───
    const stars = document.querySelectorAll('#star-rating i');
    let currentRating = 0;
    stars.forEach(star => {
        star.addEventListener('mouseenter', () => {
            const val = +star.dataset.val;
            stars.forEach(s => s.classList.toggle('lit', +s.dataset.val <= val));
        });
        star.addEventListener('click', () => { currentRating = +star.dataset.val; });
    });
    document.getElementById('star-rating').addEventListener('mouseleave', () => {
        stars.forEach(s => s.classList.toggle('lit', +s.dataset.val <= currentRating));
    });
    document.getElementById('submit-rating-btn').addEventListener('click', () => {
        if (currentRating === 0) { toast('Validation Error', 'Please select a rating (1-5). CHECK constraint enforced.', 'warning'); return; }
        const dName = currentlyAssignedDriver ? currentlyAssignedDriver.name : 'driver';
        const dId = currentlyAssignedDriver ? currentlyAssignedDriver.id : 1;
        toast('Rating Submitted', `trg_update_driver_rating fired for ${dName}. Score: ${currentRating}/5`, 'success');
        addAuditLog('TRIGGER_FIRED', `trg_update_driver_rating: Recalculated avg_rating for driver_id ${dId}.`, 'trigger');
        
        // Reset and hide panel after submission
        currentRating = 0;
        stars.forEach(s => s.classList.remove('lit'));
        const rtContent = document.getElementById('rating-active-content');
        const rtPlaceholder = document.getElementById('rating-placeholder');
        if (rtContent) rtContent.style.display = 'none';
        if (rtPlaceholder) rtPlaceholder.style.display = 'block';
    });

    // ─── DRIVER FLEET CARDS (PUNE DRIVERS) ───
    const drivers = [
        { id:1, name:'Raj Patil', vehicle:'Maruti Ciaz', plate:'MH-12-AB-1234', type:'SEDAN', rating:4.9, rides:342, revenue:48200, status:'AVAILABLE',
          rideHistory: [
            { id:'#RD-10042', date:'2024-04-10', rider:'Amit Deshmukh', route:'Shivajinagar → Hinjewadi', dist:'14.5 km', fare:'₹540', pay:'UPI', rating:5, status:'COMPLETED' },
            { id:'#RD-10039', date:'2024-04-09', rider:'Kavita Pawar', route:'Deccan → Koregaon Park', dist:'6.2 km', fare:'₹248', pay:'CARD', rating:5, status:'COMPLETED' },
            { id:'#RD-10035', date:'2024-04-08', rider:'Rohit Jain', route:'Baner → Swargate', dist:'12.8 km', fare:'₹395', pay:'UPI', rating:4, status:'COMPLETED' },
            { id:'#RD-10030', date:'2024-04-07', rider:'Priya Sharma', route:'Pune Stn → Magarpatta', dist:'8.1 km', fare:'₹290', pay:'WALLET', rating:5, status:'COMPLETED' },
            { id:'#RD-10027', date:'2024-04-06', rider:'Sneha Kulkarni', route:'Kothrud → Viman Nagar', dist:'16.3 km', fare:'₹580', pay:'UPI', rating:5, status:'COMPLETED' },
            { id:'#RD-10022', date:'2024-04-05', rider:'Aditya Rao', route:'Hinjewadi → Shivajinagar', dist:'14.2 km', fare:'₹530', pay:'CASH', rating:4, status:'COMPLETED' },
          ]},
        { id:2, name:'Vikram Joshi', vehicle:'Toyota Innova Crysta', plate:'MH-12-CD-5678', type:'SUV', rating:4.8, rides:289, revenue:67500, status:'AVAILABLE',
          rideHistory: [
            { id:'#RD-10043', date:'2024-04-11', rider:'Sneha Kulkarni', route:'Koregaon Park → Magarpatta', dist:'6.8 km', fare:'₹280', pay:'WALLET', rating:4, status:'COMPLETED' },
            { id:'#RD-10037', date:'2024-04-09', rider:'Rohan Mehta', route:'Baner → Deccan', dist:'7.5 km', fare:'₹310', pay:'UPI', rating:5, status:'COMPLETED' },
            { id:'#RD-10031', date:'2024-04-07', rider:'Amit Deshmukh', route:'Swargate → Hinjewadi', dist:'18.4 km', fare:'₹720', pay:'UPI', rating:5, status:'COMPLETED' },
            { id:'#RD-10025', date:'2024-04-05', rider:'Kavita Pawar', route:'Pune Stn → Kothrud', dist:'9.6 km', fare:'₹380', pay:'CARD', rating:4, status:'COMPLETED' },
            { id:'#RD-10020', date:'2024-04-04', rider:'Neha Patil', route:'Viman Nagar → Baner', dist:'15.1 km', fare:'₹590', pay:'UPI', rating:5, status:'COMPLETED' },
          ]},
        { id:3, name:'Anil More', vehicle:'Honda City', plate:'MH-14-EF-9012', type:'SEDAN', rating:4.7, rides:198, revenue:38900, status:'ON_RIDE',
          rideHistory: [
            { id:'#RD-10044', date:'2024-04-12', rider:'Priya Sharma', route:'Pune Station → Baner', dist:'10.2 km', fare:'₹420', pay:'UPI', rating:5, status:'COMPLETED' },
            { id:'#RD-10040', date:'2024-04-10', rider:'Rohan Mehta', route:'Shivajinagar → Kothrud', dist:'4.8 km', fare:'₹195', pay:'CASH', rating:4, status:'COMPLETED' },
            { id:'#RD-10036', date:'2024-04-08', rider:'Sneha Kulkarni', route:'Magarpatta → Deccan', dist:'11.5 km', fare:'₹440', pay:'UPI', rating:5, status:'COMPLETED' },
            { id:'#RD-10028', date:'2024-04-06', rider:'Aditya Rao', route:'Koregaon Park → Swargate', dist:'5.4 km', fare:'₹210', pay:'WALLET', rating:4, status:'COMPLETED' },
            { id:'#RD-10045', date:'2024-04-14', rider:'Rohan Mehta', route:'Deccan → Viman Nagar', dist:'8.4 km', fare:'₹350', pay:'CARD', rating:0, status:'IN_PROGRESS' },
          ]},
        { id:4, name:'Suresh Gaikwad', vehicle:'Mercedes E-Class', plate:'MH-12-GH-3456', type:'LUXURY', rating:4.5, rides:175, revenue:41200, status:'ON_RIDE',
          rideHistory: [
            { id:'#RD-10041', date:'2024-04-10', rider:'Amit Deshmukh', route:'Koregaon Park → Hinjewadi', dist:'18.9 km', fare:'₹1420', pay:'CARD', rating:5, status:'COMPLETED' },
            { id:'#RD-10033', date:'2024-04-07', rider:'Priya Sharma', route:'Deccan → Magarpatta', dist:'11.2 km', fare:'₹890', pay:'UPI', rating:4, status:'COMPLETED' },
            { id:'#RD-10026', date:'2024-04-05', rider:'Rohan Mehta', route:'Baner → Shivajinagar', dist:'9.5 km', fare:'₹750', pay:'WALLET', rating:5, status:'COMPLETED' },
            { id:'#RD-10048', date:'2024-04-14', rider:'Kavita Pawar', route:'Swargate → Koregaon Park', dist:'5.1 km', fare:'₹420', pay:'UPI', rating:0, status:'IN_PROGRESS' },
          ]},
        { id:5, name:'Deepak Shinde', vehicle:'Hyundai i20', plate:'MH-14-IJ-7890', type:'HATCHBACK', rating:3.8, rides:95, revenue:12800, status:'OFFLINE',
          rideHistory: [
            { id:'#RD-10038', date:'2024-04-09', rider:'Sneha Kulkarni', route:'Swargate → Kothrud', dist:'5.2 km', fare:'₹130', pay:'CASH', rating:3, status:'COMPLETED' },
            { id:'#RD-10032', date:'2024-04-07', rider:'Rohan Mehta', route:'Deccan → Baner', dist:'7.0 km', fare:'₹175', pay:'UPI', rating:4, status:'COMPLETED' },
            { id:'#RD-10024', date:'2024-04-05', rider:'Amit Deshmukh', route:'Pune Stn → Shivajinagar', dist:'2.8 km', fare:'₹85', pay:'WALLET', rating:4, status:'COMPLETED' },
            { id:'#RD-10046', date:'2024-04-14', rider:'Kavita Pawar', route:'Swargate → Kothrud', dist:'5.2 km', fare:'—', pay:'—', rating:0, status:'CANCELLED' },
          ]},
        { id:6, name:'Ramesh Mali', vehicle:'Honda Activa', plate:'MH-12-FG-3412', type:'BIKE', rating:4.6, rides:412, revenue:22500, status:'AVAILABLE',
          rideHistory: [
            { id:'#RD-10050', date:'2024-04-10', rider:'Amit Deshmukh', route:'Shivajinagar → Deccan', dist:'3.5 km', fare:'₹45', pay:'CASH', rating:5, status:'COMPLETED' },
          ]},
        { id:7, name:'Sanjay Kumar', vehicle:'Bajaj RE Auto', plate:'MH-12-XY-9999', type:'AUTO', rating:4.2, rides:320, revenue:18400, status:'AVAILABLE',
          rideHistory: [
            { id:'#RD-10051', date:'2024-04-11', rider:'Sneha Kulkarni', route:'Swargate → Station', dist:'5.1 km', fare:'₹80', pay:'UPI', rating:4, status:'COMPLETED' },
          ]},
        { id:8, name:'Prakash Mane', vehicle:'Honda Shine', plate:'MH-14-ZA-5566', type:'BIKE', rating:4.5, rides:150, revenue:9500, status:'AVAILABLE',
          rideHistory: []},
        { id:9, name:'Amol Shinde', vehicle:'Maruti Swift', plate:'MH-12-PQ-0011', type:'HATCHBACK', rating:4.3, rides:220, revenue:31000, status:'AVAILABLE',
          rideHistory: []},
        { id:10, name:'Rahul Deshpande', vehicle:'Toyota Fortuner', plate:'MH-12-RT-8888', type:'SUV', rating:4.9, rides:60, revenue:98000, status:'AVAILABLE',
          rideHistory: []},
    ];

    const usersData = [
        { id: 101, name: 'Amit Deshmukh', email: 'amit.d@email.com', phone: '+91 98230 11223', reg: '2023-11-12', wallet: 450.50, status: 'ACTIVE' },
        { id: 102, name: 'Sneha Kulkarni', email: 'sneha.k@email.com', phone: '+91 97654 44321', reg: '2023-12-05', wallet: 1280.00, status: 'ACTIVE' },
        { id: 103, name: 'Priya Sharma', email: 'priya.s@email.com', phone: '+91 99887 76655', reg: '2024-01-20', wallet: 85.20, status: 'ACTIVE' },
        { id: 104, name: 'Rohan Mehta', email: 'rohan.m@email.com', phone: '+91 91234 56789', reg: '2024-02-14', wallet: 3200.00, status: 'VIP' },
        { id: 105, name: 'Kavita Pawar', email: 'kavita.p@email.com', phone: '+91 95432 10987', reg: '2024-03-01', wallet: 0.00, status: 'INACTIVE' },
    ];

    function populateUserSelect() {
        const userInput = document.getElementById('user-input');
        if (!userInput) return;
        usersData.forEach(u => {
            const opt = document.createElement('option');
            opt.value = u.id;
            opt.textContent = `${u.name} (₹${u.wallet.toFixed(2)})`;
            userInput.appendChild(opt);
        });
        
        userInput.addEventListener('change', () => {
            const uid = parseInt(userInput.value);
            const user = usersData.find(x => x.id === uid);
            if (user) {
                const balEl = document.getElementById('wallet-balance-display');
                if (balEl) balEl.textContent = `₹${user.wallet.toFixed(2)}`;
            }
        });
        // Initial setup
        if (usersData.length) {
            userInput.value = usersData[0].id;
            const balEl = document.getElementById('wallet-balance-display');
            if (balEl) balEl.textContent = `₹${usersData[0].wallet.toFixed(2)}`;
        }
    }
    populateUserSelect();

    function updateUserCount() {
        const chip = document.getElementById('users-total-chip');
        if (chip) chip.textContent = `Total: ${usersData.length} active`;
        const kpi = document.querySelectorAll('.counter')[2]; // Active Users KPI
        if (kpi) kpi.textContent = usersData.length.toLocaleString();
    }

    function updateDriverCount() {
        // Driver specific counts if needed
    }

    function renderUsersTable() {
        const tbody = document.getElementById('users-tbody');
        if (!tbody) return;
        tbody.innerHTML = '';
        usersData.forEach(u => {
            const sc = u.status.toLowerCase();
            tbody.innerHTML += `
                <tr>
                    <td style="font-weight:600;color:#f5a623">#USR-${u.id}</td>
                    <td>${u.name}</td>
                    <td>
                        <div style="font-size:0.85rem">${u.email}</div>
                        <div style="font-size:0.75rem;color:#6b6350">${u.phone}</div>
                    </td>
                    <td>${u.reg}</td>
                    <td style="font-weight:600">₹${u.wallet.toLocaleString()}</td>
                    <td><span class="status-pill ${sc === 'vip' ? 'completed' : sc === 'active' ? 'in_progress' : 'cancelled'}">${u.status}</span></td>
                </tr>
            `;
        });
        chartsInit.users = true;
    }

    function renderDriverCards() {
        const grid = document.getElementById('driver-grid');
        grid.innerHTML = '';
        drivers.forEach((d, idx) => {
            const starsHtml = '★'.repeat(Math.floor(d.rating)) + (d.rating%1>=0.5?'½':'') + ' ' + d.rating;
            const card = document.createElement('div');
            card.className = 'driver-card glass-card';
            card.dataset.driverIdx = idx;
            card.innerHTML = `<div class="driver-top"><img src="https://ui-avatars.com/api/?name=${d.name.replace(' ','+')}&background=d97706&color=fff&bold=true" alt="${d.name}"><div><div class="driver-name">${d.name}</div><div class="driver-meta">${d.vehicle} · ${d.plate} · ${d.type}</div></div></div><div class="driver-stats"><div class="d-stat"><div class="d-stat-val text-purple">${d.rides}</div><div class="d-stat-label">Rides</div></div><div class="d-stat"><div class="d-stat-val text-green">₹${(d.revenue/1000).toFixed(1)}k</div><div class="d-stat-label">Revenue</div></div><div class="d-stat"><div class="d-stat-val text-orange">₹${(d.revenue*0.8/1000).toFixed(1)}k</div><div class="d-stat-label">Payout</div></div></div><div class="driver-status-bar"><span class="driver-status ${d.status.toLowerCase()}">${d.status.replace('_',' ')}</span><span class="rating-stars">${starsHtml}</span></div>`;
            card.addEventListener('click', () => openDriverModal(idx));
            grid.appendChild(card);
        });
        chartsInit.drivers = true;
    }
    renderDriverCards();

    // ═══════════════════════════════════════
    // ─── DRIVER PROFILE MODAL ───
    // ═══════════════════════════════════════
    const modal = document.getElementById('driver-modal');
    const modalHeader = document.getElementById('modal-header');
    const modalBody = document.getElementById('modal-body');

    function openDriverModal(idx) {
        const d = drivers[idx];
        const completedRides = d.rideHistory.filter(r => r.status === 'COMPLETED');
        const avgFare = completedRides.length ? (completedRides.reduce((s,r) => s + parseFloat(r.fare.replace('₹','').replace(',','')), 0) / completedRides.length) : 0;
        const statusClass = d.status === 'AVAILABLE' ? 'available' : d.status === 'ON_RIDE' ? 'on_ride' : 'offline';
        const statusBg = d.status === 'AVAILABLE' ? 'rgba(34,197,94,0.15);color:#22c55e' : d.status === 'ON_RIDE' ? 'rgba(251,191,36,0.15);color:#fbbf24' : 'rgba(107,99,80,0.15);color:#6b6350';

        modalHeader.innerHTML = `
            <img src="https://ui-avatars.com/api/?name=${d.name.replace(' ','+')}&background=d97706&color=fff&bold=true&size=128" alt="${d.name}">
            <div class="mh-info">
                <h2>${d.name}</h2>
                <p>${d.vehicle} · ${d.plate} · ${d.type}</p>
                <p style="color:#f5a623;font-size:0.8rem;margin-top:0.3rem">License: ${d.plate} · Driver ID: DRV-00${d.id}</p>
            </div>
            <span class="mh-badge" style="background:${statusBg}">${d.status.replace('_',' ')}</span>`;

        let ridesHTML = '';
        d.rideHistory.forEach(r => {
            const sc = r.status.toLowerCase().replace(' ','_');
            const ratingStars = r.rating > 0 ? '★'.repeat(r.rating) + '<span style="color:#6b6350">' + '★'.repeat(5-r.rating) + '</span>' : '<span style="color:#6b6350">—</span>';
            ridesHTML += `<tr>
                <td style="font-weight:600;color:#f5a623">${r.id}</td>
                <td>${r.date}</td>
                <td>${r.rider}</td>
                <td>${r.route}</td>
                <td>${r.dist}</td>
                <td style="font-weight:600">${r.fare}</td>
                <td>${r.pay}</td>
                <td style="color:#f59e0b">${ratingStars}</td>
                <td><span class="status-pill ${sc}">${r.status}</span></td>
            </tr>`;
        });

        modalBody.innerHTML = `
            <div class="modal-stats">
                <div class="m-stat"><div class="m-stat-val">${d.rides}</div><div class="m-stat-label">Total Rides</div></div>
                <div class="m-stat"><div class="m-stat-val">₹${(d.revenue/1000).toFixed(1)}k</div><div class="m-stat-label">Gross Revenue</div></div>
                <div class="m-stat"><div class="m-stat-val">₹${(d.revenue*0.8/1000).toFixed(1)}k</div><div class="m-stat-label">Net Payout (80%)</div></div>
                <div class="m-stat"><div class="m-stat-val">₹${avgFare.toFixed(0)}</div><div class="m-stat-label">Avg Fare</div></div>
            </div>
            <div class="modal-section-title"><i class="fa-solid fa-clock-rotate-left"></i> Recent Ride History (SELECT * FROM Rides WHERE driver_id = ${d.id})</div>
            <div style="overflow-x:auto">
                <table class="modal-rides-table">
                    <thead><tr><th>Ride ID</th><th>Date</th><th>Rider</th><th>Route</th><th>Dist</th><th>Fare</th><th>Pay</th><th>Rating</th><th>Status</th></tr></thead>
                    <tbody>${ridesHTML}</tbody>
                </table>
            </div>`;

        modal.classList.add('active');
    }

    document.getElementById('modal-close').addEventListener('click', () => modal.classList.remove('active'));
    modal.addEventListener('click', e => { if (e.target === modal) modal.classList.remove('active'); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') modal.classList.remove('active'); });

    // ═══════════════════════════════════════
    // ─── GLOBAL SEARCH ───
    // ═══════════════════════════════════════
    const searchInput = document.getElementById('global-search');
    let searchDebounce;

    searchInput.addEventListener('input', () => {
        clearTimeout(searchDebounce);
        searchDebounce = setTimeout(() => performSearch(searchInput.value.trim().toLowerCase()), 200);
    });

    function performSearch(q) {
        // Search rides table rows
        const tRows = document.querySelectorAll('#rides-tbody tr');
        tRows.forEach(tr => {
            if (!q) { tr.classList.remove('search-hidden','search-match'); return; }
            const text = tr.textContent.toLowerCase();
            const match = text.includes(q);
            tr.classList.toggle('search-hidden', !match);
            tr.classList.toggle('search-match', match);
        });

        // Search driver cards
        const dCards = document.querySelectorAll('.driver-card');
        dCards.forEach(card => {
            if (!q) { card.classList.remove('search-hidden','search-match'); return; }
            const text = card.textContent.toLowerCase();
            const match = text.includes(q);
            card.classList.toggle('search-hidden', !match);
            card.classList.toggle('search-match', match);
        });

        // Search users registry
        const uRows = document.querySelectorAll('#users-tbody tr');
        uRows.forEach(tr => {
            if (!q) { tr.classList.remove('search-hidden','search-match'); return; }
            const text = tr.textContent.toLowerCase();
            const match = text.includes(q);
            tr.classList.toggle('search-hidden', !match);
            tr.classList.toggle('search-match', match);
        });

        // Show toast with result count if query is not empty
        if (q) {
            const visibleRows = document.querySelectorAll('#rides-tbody tr:not(.search-hidden)').length;
            const visibleCards = document.querySelectorAll('.driver-card:not(.search-hidden)').length;
            const visibleUsers = document.querySelectorAll('#users-tbody tr:not(.search-hidden)').length;
            toast('Search Results', `Found ${visibleRows} ride(s), ${visibleCards} driver(s), ${visibleUsers} user(s)`, 'info');
        }
    }

    // ─── ANALYTICS CHARTS ───
    function initAnalyticsCharts() {
        if (document.getElementById('paymentChart')) {
            new Chart(document.getElementById('paymentChart'), {
                type: 'bar',
                data: { labels: ['UPI','Wallet','Credit Card','Cash'], datasets: [{ label: 'Transactions', data: [580,320,210,170], backgroundColor: ['#f5a623','#fbbf24','#d97706','#f59e0b'], borderRadius: 8, maxBarThickness: 50 }] },
                options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false }, ticks: { color: '#a89f8a', font: { family: 'Outfit' } } }, y: { grid: { color: 'rgba(255,200,50,0.04)' }, ticks: { color: '#6b6350', font: { family: 'Outfit' } } } } }
            });
        }
        const heatmap = document.getElementById('heatmap');
        if (heatmap) {
            const days = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
            const hours = ['6AM','9AM','12PM','3PM','6PM','9PM'];
            heatmap.innerHTML = '<div></div>';
            days.forEach(d => heatmap.innerHTML += `<div style="text-align:center;font-size:0.7rem;color:#6b6350;padding:0.3rem">${d}</div>`);
            hours.forEach(h => {
                heatmap.innerHTML += `<div style="font-size:0.7rem;color:#6b6350;display:grid;place-items:center">${h}</div>`;
                days.forEach(() => {
                    const i = Math.random();
                    heatmap.innerHTML += `<div class="heat-cell" style="background:rgba(${Math.floor(245*i)},${Math.floor(166*i)},${Math.floor(35*(1-i*0.5))},${0.15+i*0.7})">${Math.floor(i*120)}</div>`;
                });
            });
            heatmap.style.gridTemplateColumns = '40px repeat(7, 1fr)';
        }
        if (document.getElementById('driverPerfChart')) {
            new Chart(document.getElementById('driverPerfChart'), {
                type: 'bar',
                data: { labels: drivers.map(d=>d.name), datasets: [{ label: 'Rides', data: drivers.map(d=>d.rides), backgroundColor: 'rgba(245,166,35,0.6)', borderRadius: 6 },{ label: 'Revenue (₹k)', data: drivers.map(d=>d.revenue/1000), backgroundColor: 'rgba(34,197,94,0.6)', borderRadius: 6 }] },
                options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: '#a89f8a', font: { family: 'Outfit' } } } }, scales: { x: { grid: { display: false }, ticks: { color: '#a89f8a', font: { family: 'Outfit' } } }, y: { grid: { color: 'rgba(255,200,50,0.04)' }, ticks: { color: '#6b6350', font: { family: 'Outfit' } } } } }
            });
        }
        chartsInit.analytics = true;
    }

    // ─── SQL TERMINAL ───
    const sqlInput = document.getElementById('sql-input');
    const lineNumbers = document.getElementById('line-numbers');
    const queryPreset = document.getElementById('query-preset');

    function updateLineNumbers() {
        const n = sqlInput.value.split('\n').length;
        lineNumbers.innerHTML = '';
        for (let i = 1; i <= Math.max(n, 15); i++) lineNumbers.innerHTML += `<span>${i}</span>`;
    }
    sqlInput.addEventListener('input', updateLineNumbers);
    sqlInput.addEventListener('scroll', () => { lineNumbers.scrollTop = sqlInput.scrollTop; });
    updateLineNumbers();

    const presetQ = {
        q1: `-- Q1: Full Ride Receipt (INNER JOIN across 5 tables)\nSELECT r.ride_id, u.first_name AS rider,\n       d.first_name AS driver, v.make AS vehicle,\n       p.amount, p.payment_status\nFROM Rides r\nINNER JOIN Users u ON r.user_id = u.user_id\nINNER JOIN Drivers d ON r.driver_id = d.driver_id\nINNER JOIN Vehicles v ON r.vehicle_id = v.vehicle_id\nINNER JOIN Payments p ON r.ride_id = p.ride_id\nWHERE r.status = 'COMPLETED';`,
        q2: `-- Q2: User Spend Report (LEFT JOIN + COALESCE)\nSELECT u.first_name, u.last_name,\n       COALESCE(SUM(p.amount), 0) AS total_spent\nFROM Users u\nLEFT JOIN Rides r ON u.user_id = r.user_id\nLEFT JOIN Payments p ON r.ride_id = p.ride_id\n  AND p.payment_status = 'SUCCESS'\nGROUP BY u.user_id\nORDER BY total_spent DESC;`,
        q3: `-- Q3: Luxury Vehicle Drivers (Subquery)\nSELECT driver_id, first_name, last_name, avg_rating\nFROM Drivers\nWHERE driver_id IN (\n    SELECT driver_id FROM Vehicles\n    WHERE vehicle_type = 'LUXURY'\n);`,
        q4: `-- Q4: Revenue by Driver (GROUP BY + HAVING)\nSELECT d.driver_id, d.first_name,\n       SUM(p.amount) AS revenue_generated\nFROM Drivers d\nJOIN Rides r ON d.driver_id = r.driver_id\nJOIN Payments p ON r.ride_id = p.ride_id\nGROUP BY d.driver_id, d.first_name\nHAVING revenue_generated > 300;`,
        q5: `-- Q5: Driver Leaderboard (RANK Window Function)\nSELECT driver_id, first_name, avg_rating,\n       RANK() OVER(ORDER BY avg_rating DESC)\n         AS leaderboard_rank\nFROM Drivers;`,
        q6: `-- Q6: Cumulative Revenue (SUM OVER Window)\nSELECT payment_method, amount,\n       SUM(amount) OVER(\n         PARTITION BY payment_method\n         ORDER BY transaction_date\n       ) AS cumulative_revenue\nFROM Payments\nWHERE payment_status = 'SUCCESS';`,
        q7: `-- Q7: Ride Cancellation Analysis\nSELECT status,\n       COUNT(ride_id) AS total,\n       ROUND((COUNT(ride_id) /\n         (SELECT COUNT(*) FROM Rides)) * 100, 2)\n         AS pct\nFROM Rides\nGROUP BY status;`,
        q8: `-- Q8: Top 3 Lucrative Drivers (Multi-tier)\nSELECT d.license_number,\n       CONCAT(d.first_name,' ',d.last_name) AS name,\n       v.model, COUNT(r.ride_id) AS trips,\n       SUM(p.amount) AS revenue\nFROM Drivers d\nJOIN Vehicles v ON d.driver_id = v.driver_id\nJOIN Rides r ON d.driver_id = r.driver_id\nJOIN Payments p ON r.ride_id = p.ride_id\nWHERE r.status = 'COMPLETED'\nGROUP BY d.driver_id, v.model\nORDER BY revenue DESC LIMIT 3;`,
    };

    const presetR = {
        q1: { cols:['ride_id','rider','driver','vehicle','amount','status'], rows:[['1','Amit','Raj','Maruti','540.00','SUCCESS'],['2','Sneha','Vikram','Toyota','280.00','SUCCESS'],['3','Priya','Anil','Honda','420.00','SUCCESS']] },
        q2: { cols:['first_name','last_name','total_spent'], rows:[['Amit','Deshmukh','540.00'],['Priya','Sharma','420.00'],['Sneha','Kulkarni','280.00'],['Rohan','Mehta','0.00'],['Kavita','Pawar','0.00']] },
        q3: { cols:['driver_id','first_name','last_name','avg_rating'], rows:[['4','Suresh','Gaikwad','4.50']] },
        q4: { cols:['driver_id','first_name','revenue'], rows:[['1','Raj','540.00'],['3','Anil','420.00'],['2','Vikram','280.00']] },
        q5: { cols:['driver_id','first_name','avg_rating','rank'], rows:[['1','Raj','4.90','1'],['2','Vikram','4.80','2'],['3','Anil','4.70','3'],['4','Suresh','4.50','4'],['5','Deepak','3.80','5']] },
        q6: { cols:['method','amount','cumulative'], rows:[['UPI','540.00','540.00'],['UPI','420.00','960.00'],['WALLET','280.00','280.00']] },
        q7: { cols:['status','total','pct'], rows:[['COMPLETED','3','60.00'],['IN_PROGRESS','1','20.00'],['CANCELLED','1','20.00']] },
        q8: { cols:['license','name','model','trips','revenue'], rows:[['MH-12-AB-1234','Raj Patil','Ciaz','1','540.00'],['MH-14-EF-9012','Anil More','City','1','420.00'],['MH-12-CD-5678','Vikram Joshi','Innova','1','280.00']] },
    };

    queryPreset.addEventListener('change', () => { if (presetQ[queryPreset.value]) { sqlInput.value = presetQ[queryPreset.value]; updateLineNumbers(); } });

    document.getElementById('run-query-btn').addEventListener('click', () => {
        const q = sqlInput.value.trim();
        const output = document.getElementById('sql-output');
        const meta = document.getElementById('result-meta');
        if (!q) { toast('Error', 'Query editor is empty.', 'error'); return; }

        output.innerHTML = '<div class="output-placeholder"><i class="fa-solid fa-spinner fa-spin" style="font-size:2rem;color:#f5a623"></i><p>Executing on nexaride_db…</p></div>';

        setTimeout(() => {
            const r = presetR[queryPreset.value];
            if (r) {
                let h = '<table class="result-table"><thead><tr>';
                r.cols.forEach(c => h += `<th>${c}</th>`);
                h += '</tr></thead><tbody>';
                r.rows.forEach(row => { h += '<tr>'; row.forEach(cell => h += `<td>${cell}</td>`); h += '</tr>'; });
                h += '</tbody></table>';
                output.innerHTML = h;
                meta.textContent = `${r.rows.length} row(s) in ${(Math.random()*40+10).toFixed(2)} ms`;
                toast('Query Executed', `${r.rows.length} rows fetched successfully.`, 'success');
            } else {
                output.innerHTML = '<div class="output-placeholder" style="color:#22c55e"><i class="fa-solid fa-check-circle" style="font-size:2rem"></i><p>Query executed successfully.<br><small style="color:#6b6350">Use a preset for simulated output.</small></p></div>';
                meta.textContent = 'Custom query executed';
                toast('Executed', 'Custom query processed.', 'info');
            }
        }, 800);
    });

    // ─── INIT TOAST ───
    setTimeout(() => toast('System Online', 'Connected to nexaride_db · Pune Region · 7 tables, 5 triggers active.', 'info'), 1200);
});
