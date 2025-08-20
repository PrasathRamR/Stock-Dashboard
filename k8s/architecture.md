# FinAPP Kubernetes 2-Node Architecture

## Overview
This architecture separates the backend (API + analytics + dataset handling) and frontend (static React app) into two independent nodes/pods for optimal performance and scalability.

```
+-------------------+         +-------------------+
|  Node 1           |         |  Node 2           |
|  (Backend/API)    |         |  (Frontend)       |
|                   |         |                   |
|  +-------------+  |         |  +-------------+  |
|  | finapp-back |<---------->|  | finapp-front|  |
|  +-------------+  |  HTTP   |  +-------------+  |
|  | Dataset PVC |  |  REST   |                   |
|  +-------------+  |         |                   |
+-------------------+         +-------------------+
```

- **Node 1:** Runs Node.js backend, mounts dataset PVC, exposes API on port 4000.
- **Node 2:** Runs static frontend server (Nginx), exposes UI on port 80.

## Kubernetes Resources
- `backend-deployment.yaml`: Backend pod, dataset PVC mount, API service
- `frontend-deployment.yaml`: Frontend pod, static server, web service
- `pvc.yaml`: PersistentVolumeClaim for datasets
- `configmap.yaml`: Environment variables for backend

## Deployment Steps
1. Apply PVC and ConfigMap:
   ```
   kubectl apply -f k8s/pvc.yaml
   kubectl apply -f k8s/configmap.yaml
   ```
2. Deploy backend and frontend:
   ```
   kubectl apply -f k8s/backend-deployment.yaml
   kubectl apply -f k8s/frontend-deployment.yaml
   ```
3. Expose services as needed (LoadBalancer/Ingress for production).

## Local vs K8s Deployment
| Feature                | Local Dev         | Kubernetes 2-Node         |
|------------------------|-------------------|---------------------------|
| Backend + Dataset      | Node.js process   | Dedicated backend pod     |
| Frontend               | React dev server  | Static server pod         |
| Dataset Storage        | Local FS          | PersistentVolumeClaim     |
| Env Config             | .env file         | K8s ConfigMap/Secret      |
| Scaling                | Manual            | Declarative (replicas)    |
| Fault Tolerance        | Manual restart    | Pod auto-restart          |

## Troubleshooting
- **PVC not mounting:** Check storage class and node compatibility.
- **API not reachable:** Ensure backend service is running and frontend is proxying correctly.
- **Env vars not set:** Verify ConfigMap is mounted and referenced in deployment.

## Performance & Scalability
- Backend pod can request more CPU/memory for analytics.
- Frontend pod is lightweight, can be scaled independently.
- Efficient inter-pod communication via ClusterIP services.
