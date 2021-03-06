package org.scratchjr.android;

import android.os.Handler;
import android.os.Message;
import android.content.Context;
import android.net.nsd.NsdManager;
import android.net.nsd.NsdServiceInfo;
import android.util.Log;


public class ConnectManager {
    public static final String SERVICE_TYPE = "_http._tcp.";
    public String mServiceName = "ScratchJrRover";

    private static final String LOG_TAG = "ScratchJr.ConnMan";

    private ScratchJrActivity _application;
    private Context _context;
    private NsdManager _nsdManager;

    private NsdManager.DiscoveryListener _nsdDiscoveryListener;
    private NsdManager.ResolveListener _nsdResolveListener;
    private NsdServiceInfo _service;

    private RoverConnection _roverConnection;
    private Handler _updateHandler;

    private boolean _isStarted;

    public ConnectManager(ScratchJrActivity application) {
        _application = application;
        _context = application.getApplicationContext();
        _nsdManager = (NsdManager)_context.getSystemService(_context.NSD_SERVICE);
        _isStarted = false;
        //_roverConnection = new

        _updateHandler = new Handler() {
            @Override
            public void handleMessage(Message msg) {
                String chatLine = msg.getData().getString("msg");
               // addChatLine(chatLine);
            }
        };

        _roverConnection = new RoverConnection(_updateHandler);

        _nsdDiscoveryListener = new NsdManager.DiscoveryListener() {

            // Called as soon as service discovery begins.
            @Override
            public void onDiscoveryStarted(String regType) {
                _isStarted = true;
                Log.e(LOG_TAG, "Service discovery started");
            }

            @Override
            public void onServiceFound(NsdServiceInfo service) {
                // A service was found! Do something with it.
                Log.e(LOG_TAG, "Service discovery success" + service);
                if (!service.getServiceType().equals(SERVICE_TYPE)) {
                    // Service type is the string containing the protocol and
                    // transport layer for this service.
                    Log.e(LOG_TAG, "Unknown Service Type: " + service.getServiceType());
                } else if (service.getServiceName().equals(mServiceName)){
                    Log.d(LOG_TAG, "@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@ Same machine: Find ScratchJrRover!");
                    _nsdManager.resolveService(service, _nsdResolveListener);
                }
            }

            @Override
            public void onServiceLost(NsdServiceInfo service) {
                // When the network service is no longer available.
                // Internal bookkeeping code goes here.
                Log.e(LOG_TAG, "service lost: " + service);
                if (_service == service) {
                    _service = null;
                }
            }

            @Override
            public void onDiscoveryStopped(String serviceType) {
                Log.i(LOG_TAG, "Discovery stopped: " + serviceType);
            }

            @Override
            public void onStartDiscoveryFailed(String serviceType, int errorCode) {
                Log.e(LOG_TAG, "Discovery failed: Error code:" + errorCode);
                _nsdManager.stopServiceDiscovery(this);
            }

            @Override
            public void onStopDiscoveryFailed(String serviceType, int errorCode) {
                Log.e(LOG_TAG, "Discovery failed: Error code:" + errorCode);
                _nsdManager.stopServiceDiscovery(this);
            }
        };

        _nsdResolveListener = new NsdManager.ResolveListener() {
            @Override
            public void onResolveFailed(NsdServiceInfo serviceInfo, int errorCode) {
                Log.e(LOG_TAG, "Resolve failed" + errorCode);
            }
            @Override
            public void onServiceResolved(NsdServiceInfo serviceInfo) {
                Log.e(LOG_TAG, "Resolve Succeeded. " + serviceInfo);
                if (serviceInfo.getServiceName().equals("MegaPrinter")) {
                    Log.d(LOG_TAG, "################################## Same IP.");
                }
                _service = serviceInfo;
            }
        };
    }

    public void open() {
        discoverServices();
    }

    public void close() {
        stopDiscovery();
    }

    public void discoverServices() {
        if(_isStarted == false) {
            _nsdManager.discoverServices(SERVICE_TYPE, NsdManager.PROTOCOL_DNS_SD, _nsdDiscoveryListener);
            Log.d(LOG_TAG, "##### Start discovering services #####");
        } else {
            Log.d(LOG_TAG, "##### Discovery already starte4d, ignore the request #####");
        }
    }

    public void stopDiscovery() {
        if (_isStarted == true && _nsdDiscoveryListener != null) {
            try {
                _nsdManager.stopServiceDiscovery(_nsdDiscoveryListener);
                Log.d(LOG_TAG, "##### Stop discovering services #####");
            } catch (java.lang.IllegalArgumentException ex){

            }finally {
            }
            //_nsdDiscoveryListener = null;
        }
    }

    public void connect2Rover() {
        if (_service != null) {
            Log.d(LOG_TAG, "Connecting.");
            _roverConnection.connectToServer(_service.getHost(), _service.getPort());
            try {
                Thread.sleep(1000);
            }catch (java.lang.InterruptedException e) {

            }
            sendCommand();
        } else {
            Log.d(LOG_TAG, "No service to connect to!");
        }
    }

    public void sendCommand() {
        String messageString = "Test Send";
        if (!messageString.isEmpty()) {
            _roverConnection.sendMessage(messageString);
        }
    }
}
